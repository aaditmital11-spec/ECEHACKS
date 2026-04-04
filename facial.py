import cv2
import numpy as np

from presence_detector import FacePresenceDetector


def main() -> None:
    detector = FacePresenceDetector(camera_index=0)
    detector.start()

    try:
        while True:
            frame = detector.get_latest_frame()
            if frame is None:
                snapshot = detector.get_snapshot()
                if snapshot.error:
                    print(f"ERROR: {snapshot.error}")
                    break
                cv2.waitKey(50)
                continue

            decoded = cv2.imdecode(np.frombuffer(frame, dtype=np.uint8), cv2.IMREAD_COLOR)

            if decoded is None:
                cv2.waitKey(30)
                continue

            cv2.imshow("Face Presence Detection", decoded)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        detector.stop()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

