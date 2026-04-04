import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ---------------------------------------------------------
# FACE DETECTION WITH MEDIAPIPE TASKS
# ---------------------------------------------------------
# This program:
# 1. Opens your webcam
# 2. Detects whether a face is present
# 3. Stores that result in a variable called "present"
# 4. Draws a box around the detected face
# 5. Shows the result on screen
# 6. Lets you quit by pressing q
# ---------------------------------------------------------



# STEP 1: LOAD THE FACE DETECTION MODEL
MODEL_PATH = "blaze_face_short_range.tflite"
base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.FaceDetectorOptions(base_options=base_options)
detector = vision.FaceDetector.create_from_options(options)

# Shared webcam handle for backend polling mode
_cap = None


def init_camera(camera_index=0):
    global _cap
    # Reuse already-open camera across backend checks.
    if _cap is not None and _cap.isOpened():
        return _cap

    # Open camera once and keep it for future polls.
    _cap = cv2.VideoCapture(camera_index)
    if not _cap.isOpened():
        _cap.release()
        _cap = None
        return None
    return _cap


def release_camera():
    global _cap
    # Safe cleanup for backend shutdown.
    if _cap is not None:
        _cap.release()
        _cap = None


def detect_presence_and_frame(frame):
    # Shared detector path used by both backend checks and demo UI.
    # Convert image from BGR to RGB for MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Convert the frame into a MediaPipe image
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    # Run face detection on the MediaPipe image
    detection_result = detector.detect(mp_image)

    # Start by assuming nobody is present by default
    present = False

    # If at least one detection exists, then someone is present
    if detection_result.detections:
        present = True
        for detection in detection_result.detections:
            bbox = detection.bounding_box

            x = bbox.origin_x
            y = bbox.origin_y
            w = bbox.width
            h = bbox.height

            # Draw box around detected face
            cv2.rectangle(
                frame,
                (x, y),
                (x + w, y + h),
                (0, 255, 0),
                2
            )

    return present, frame


def is_user_present():
    """Returns True if a face is detected on a fresh webcam frame, else False."""
    # Backend mode: fetch one frame and return only the boolean result.
    cap = init_camera(0)
    if cap is None:
        return False

    ret, frame = cap.read()
    if not ret:
        return False

    present, _ = detect_presence_and_frame(frame)
    return present


def run_demo():
    # STEP 2: START THE WEBCAM
    # Demo mode uses its own local camera handle for display loop.
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("ERROR: Could not open webcam.")
        print("Try changing cv2.VideoCapture(0) to cv2.VideoCapture(1)")
        return

    # STEP 3: MAIN LOOP
    while True:
        # ret is if the webcam works
        # frame is the image from the webcam
        ret, frame = cap.read()

        if not ret:
            print("ERROR: Could not read frame from webcam.")
            break

        # STEP 4: CREATE A PRESENCE VARIABLE
        present, frame = detect_presence_and_frame(frame)

        # STEP 5: SHOW STATUS ON SCREEN
        if present:
            cv2.putText(
                frame,
                "Working",
                (20, 40),
                cv2.FONT_HERSHEY_DUPLEX,
                1,
                (0, 255, 0),
                2
            )
        else:
            cv2.putText(
                frame,
                "NOT PRESENT",
                (20, 40),
                cv2.FONT_HERSHEY_DUPLEX,
                1,
                (0, 0, 255),
                2
            )

        cv2.imshow("Face Presence Detection", frame)

        # breaks the loop if you press q
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # STEP 6: CLEAN UP
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_demo()

