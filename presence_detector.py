import threading
import time
from dataclasses import dataclass
from typing import Generator, Optional

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


MODEL_PATH = "blaze_face_short_range.tflite"
DEFAULT_JPEG_QUALITY = 80
UNSET = object()


@dataclass
class PresenceSnapshot:
    present: bool
    last_seen_timestamp: Optional[int]
    absent_duration_ms: int
    confidence: Optional[float]
    service_status: str
    camera_status: str
    error: Optional[str]
    preview_available: bool
    updated_at: int

    def to_dict(self) -> dict[str, object]:
        return {
            "present": self.present,
            "lastSeenTimestamp": self.last_seen_timestamp,
            "absentDurationMs": self.absent_duration_ms,
            "confidence": self.confidence,
            "serviceStatus": self.service_status,
            "cameraStatus": self.camera_status,
            "error": self.error,
            "previewAvailable": self.preview_available,
            "updatedAt": self.updated_at,
        }


class FacePresenceDetector:
    def __init__(self, camera_index: int = 0, model_path: str = MODEL_PATH):
        self.camera_index = camera_index
        self.model_path = model_path
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._capture: Optional[cv2.VideoCapture] = None
        self._detector = None
        self._latest_frame: Optional[bytes] = None
        self._snapshot = PresenceSnapshot(
            present=False,
            last_seen_timestamp=None,
            absent_duration_ms=0,
            confidence=None,
            service_status="connecting",
            camera_status="connecting",
            error=None,
            preview_available=False,
            updated_at=self._now_ms(),
        )

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(target=self._run, name="presence-detector", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

        if self._capture is not None:
            self._capture.release()
            self._capture = None

    def get_snapshot(self) -> PresenceSnapshot:
        with self._lock:
            snapshot = self._snapshot

        if snapshot.present or snapshot.last_seen_timestamp is None:
            absent_duration_ms = 0 if snapshot.present else snapshot.absent_duration_ms
        else:
            absent_duration_ms = max(0, self._now_ms() - snapshot.last_seen_timestamp)

        return PresenceSnapshot(
            present=snapshot.present,
            last_seen_timestamp=snapshot.last_seen_timestamp,
            absent_duration_ms=absent_duration_ms,
            confidence=snapshot.confidence,
            service_status=snapshot.service_status,
            camera_status=snapshot.camera_status,
            error=snapshot.error,
            preview_available=snapshot.preview_available,
            updated_at=snapshot.updated_at,
        )

    def get_latest_frame(self) -> Optional[bytes]:
        with self._lock:
            return self._latest_frame

    def stream_frames(self) -> Generator[bytes, None, None]:
        while not self._stop_event.is_set():
            frame = self.get_latest_frame()
            if frame is None:
                time.sleep(0.1)
                continue

            yield frame
            time.sleep(0.05)

    def _run(self) -> None:
        try:
            self._detector = self._create_detector()
            self._capture = cv2.VideoCapture(self.camera_index)

            if not self._capture.isOpened():
                raise RuntimeError(
                    f"Could not open webcam at index {self.camera_index}. "
                    "Try running the service with a different camera index."
                )

            self._set_snapshot(service_status="ready", camera_status="streaming", error=None)

            while not self._stop_event.is_set():
                ok, frame = self._capture.read()
                if not ok:
                    self._set_snapshot(
                        service_status="error",
                        camera_status="error",
                        error="Could not read a frame from the webcam.",
                        present=False,
                        confidence=None,
                        preview_available=False,
                    )
                    time.sleep(0.25)
                    continue

                analyzed_frame = self._analyze_frame(frame)
                encoded_frame = self._encode_frame(analyzed_frame)
                with self._lock:
                    self._latest_frame = encoded_frame
        except Exception as error:
            self._set_snapshot(
                service_status="error",
                camera_status="error",
                error=str(error),
                present=False,
                confidence=None,
                preview_available=False,
            )
        finally:
            if self._capture is not None:
                self._capture.release()
                self._capture = None

    def _create_detector(self):
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = vision.FaceDetectorOptions(base_options=base_options)
        return vision.FaceDetector.create_from_options(options)

    def _analyze_frame(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        detection_result = self._detector.detect(mp_image)

        present = False
        confidence = None
        now_ms = self._now_ms()
        last_seen_timestamp = self.get_snapshot().last_seen_timestamp

        if detection_result.detections:
            present = True
            last_seen_timestamp = now_ms
            confidence = max(
                (
                    category.score
                    for detection in detection_result.detections
                    for category in getattr(detection, "categories", [])
                ),
                default=None,
            )

            for detection in detection_result.detections:
                bbox = detection.bounding_box
                x = bbox.origin_x
                y = bbox.origin_y
                w = bbox.width
                h = bbox.height
                cv2.rectangle(frame, (x, y), (x + w, y + h), (86, 214, 144), 2)

        absent_duration_ms = 0
        if not present and last_seen_timestamp is not None:
            absent_duration_ms = max(0, now_ms - last_seen_timestamp)

        status_text = "PRESENT" if present else "AWAY"
        status_color = (86, 214, 144) if present else (255, 191, 92)
        cv2.putText(frame, status_text, (18, 34), cv2.FONT_HERSHEY_DUPLEX, 0.9, status_color, 2)

        if absent_duration_ms > 0:
            away_seconds = absent_duration_ms // 1000
            cv2.putText(
                frame,
                f"Away {away_seconds}s",
                (18, 64),
                cv2.FONT_HERSHEY_DUPLEX,
                0.65,
                (220, 225, 232),
                1,
            )

        self._set_snapshot(
            service_status="ready",
            camera_status="streaming",
            error=None,
            present=present,
            last_seen_timestamp=last_seen_timestamp,
            absent_duration_ms=absent_duration_ms,
            confidence=confidence,
            preview_available=True,
        )

        return frame

    def _encode_frame(self, frame) -> Optional[bytes]:
        ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), DEFAULT_JPEG_QUALITY])
        if not ok:
            return None

        return buffer.tobytes()

    def _set_snapshot(
        self,
        *,
        service_status: str | object = UNSET,
        camera_status: str | object = UNSET,
        error: Optional[str] | object = UNSET,
        present: Optional[bool] | object = UNSET,
        last_seen_timestamp: Optional[int] | object = UNSET,
        absent_duration_ms: Optional[int] | object = UNSET,
        confidence: Optional[float] | object = UNSET,
        preview_available: Optional[bool] | object = UNSET,
    ) -> None:
        with self._lock:
            current = self._snapshot
            self._snapshot = PresenceSnapshot(
                present=current.present if present is UNSET else present,
                last_seen_timestamp=current.last_seen_timestamp if last_seen_timestamp is UNSET else last_seen_timestamp,
                absent_duration_ms=current.absent_duration_ms if absent_duration_ms is UNSET else absent_duration_ms,
                confidence=current.confidence if confidence is UNSET else confidence,
                service_status=current.service_status if service_status is UNSET else service_status,
                camera_status=current.camera_status if camera_status is UNSET else camera_status,
                error=current.error if error is UNSET else error,
                preview_available=current.preview_available if preview_available is UNSET else preview_available,
                updated_at=self._now_ms(),
            )

    @staticmethod
    def _now_ms() -> int:
        return int(time.time() * 1000)
