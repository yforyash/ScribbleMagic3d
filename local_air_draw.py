import cv2
import numpy as np
import mediapipe as mp

cap = cv2.VideoCapture(0)
cap.set(3, 1280)
cap.set(4, 720)

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.85, min_tracking_confidence=0.8)

colors = [(0, 0, 255), (0, 255, 0), (255, 0, 0), (0, 255, 255), (0, 0, 0)]
color_names = ["Red", "Green", "Blue", "Yellow", "Eraser"]
current_color = colors[0]

canvas = np.zeros((720, 1280, 3), dtype=np.uint8)

prev_x, prev_y = 0, 0
brush_thickness = 10
eraser_thickness = 50

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb_frame)

    cv2.rectangle(frame, (0, 0), (1280, 80), (50, 50, 50), -1)
    for i, col in enumerate(colors):
        cv2.rectangle(frame, (10 + i * 200, 10), (190 + i * 200, 70), col, -1)
        cv2.putText(frame, color_names[i], (20 + i * 200, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    cv2.rectangle(frame, (1050, 10), (1250, 70), (100, 100, 100), -1)
    cv2.putText(frame, "CLEAR", (1110, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            landmarks = hand_landmarks.landmark
            
            ix, iy = int(landmarks[8].x * 1280), int(landmarks[8].y * 720)
            mx, my = int(landmarks[12].x * 1280), int(landmarks[12].y * 720)

            idx_up = landmarks[8].y < landmarks[6].y
            mid_up = landmarks[12].y < landmarks[10].y

            if idx_up and mid_up:
                prev_x, prev_y = 0, 0
                if iy < 80:
                    if 10 < ix < 190:
                        current_color = colors[0]
                    elif 210 < ix < 390:
                        current_color = colors[1]
                    elif 410 < ix < 590:
                        current_color = colors[2]
                    elif 610 < ix < 790:
                        current_color = colors[3]
                    elif 810 < ix < 990:
                        current_color = colors[4]
                    elif 1050 < ix < 1250:
                        canvas = np.zeros((720, 1280, 3), dtype=np.uint8)
                
                cv2.circle(frame, (ix, iy), 15, (255, 255, 255), cv2.FILLED)

            elif idx_up and not mid_up:
                cv2.circle(frame, (ix, iy), 10, current_color, cv2.FILLED)
                if prev_x == 0 and prev_y == 0:
                    prev_x, prev_y = ix, iy
                
                thickness = eraser_thickness if current_color == (0, 0, 0) else brush_thickness
                cv2.line(canvas, (prev_x, prev_y), (ix, iy), current_color, thickness)
                prev_x, prev_y = ix, iy
            else:
                prev_x, prev_y = 0, 0

    gray_canvas = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
    _, thresh_canvas = cv2.threshold(gray_canvas, 20, 255, cv2.THRESH_BINARY_INV)
    thresh_canvas = cv2.cvtColor(thresh_canvas, cv2.COLOR_GRAY2BGR)
    
    frame = cv2.bitwise_and(frame, thresh_canvas)
    frame = cv2.bitwise_or(frame, canvas)

    cv2.imshow("ScribbleMagic Local Pen", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
