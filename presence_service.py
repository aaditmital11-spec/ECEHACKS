import argparse
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Tuple

from presence_detector import FacePresenceDetector


def build_handler(detector: FacePresenceDetector):
    class PresenceRequestHandler(BaseHTTPRequestHandler):
        server_version = "LockedInPresence/1.0"

        def do_GET(self) -> None:
            if self.path.startswith("/health") or self.path.startswith("/status"):
                self._send_json(detector.get_snapshot().to_dict())
                return

            if self.path.startswith("/stream.mjpg"):
                self._stream_frames()
                return

            if self.path.startswith("/snapshot.jpg"):
                frame = detector.get_latest_frame()
                if frame is None:
                    self.send_error(HTTPStatus.SERVICE_UNAVAILABLE, "Camera preview is not ready yet.")
                    return

                self.send_response(HTTPStatus.OK)
                self._send_common_headers()
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(len(frame)))
                self.end_headers()
                self.wfile.write(frame)
                return

            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint.")

        def do_OPTIONS(self) -> None:
            self.send_response(HTTPStatus.NO_CONTENT)
            self._send_common_headers()
            self.end_headers()

        def log_message(self, format: str, *args) -> None:
            return

        def _send_json(self, payload: dict[str, object]) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self._send_common_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _stream_frames(self) -> None:
            boundary = "frame"
            self.send_response(HTTPStatus.OK)
            self._send_common_headers()
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Content-Type", f"multipart/x-mixed-replace; boundary={boundary}")
            self.end_headers()

            try:
                for frame in detector.stream_frames():
                    self.wfile.write(f"--{boundary}\r\n".encode("utf-8"))
                    self.wfile.write(b"Content-Type: image/jpeg\r\n")
                    self.wfile.write(f"Content-Length: {len(frame)}\r\n\r\n".encode("utf-8"))
                    self.wfile.write(frame)
                    self.wfile.write(b"\r\n")
            except (BrokenPipeError, ConnectionResetError):
                return

        def _send_common_headers(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Cache-Control", "no-store")

    return PresenceRequestHandler


def parse_args() -> Tuple[str, int, int]:
    parser = argparse.ArgumentParser(description="LockedIn local presence detection service")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--camera-index", type=int, default=0)
    args = parser.parse_args()
    return args.host, args.port, args.camera_index


def main() -> None:
    host, port, camera_index = parse_args()
    detector = FacePresenceDetector(camera_index=camera_index)
    detector.start()

    server = ThreadingHTTPServer((host, port), build_handler(detector))

    print(f"LockedIn presence service running at http://{host}:{port}")
    print("Endpoints: /status, /health, /stream.mjpg, /snapshot.jpg")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        detector.stop()


if __name__ == "__main__":
    main()
