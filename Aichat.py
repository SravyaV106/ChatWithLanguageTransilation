from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from deep_translator import GoogleTranslator
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow Cross-Origin Resource Sharing
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('send_message')
def handle_message(data):
    """
    Handles incoming messages, translates them, and emits the translation back.
    """
    try:
        # Extract the original text from the received data
        original_text = data.get('message')
        if not original_text:
            raise ValueError("No message content provided.")

        # Log the received message
        print(f"Received message: {original_text}")

        # Perform translation using GoogleTranslator
        translation = GoogleTranslator(source='auto', target='te').translate(original_text)

        # Log the translated text
        print(f"Translated text: {translation}")

        # Prepare the response object
        response = {
            'original_text': original_text,
            'translated_text': translation,
        }

        # Emit the translated message back to all connected clients
        emit('receive_message', response, broadcast=True)

    except Exception as e:
        # Log the error for debugging purposes
        print(f"Error during translation: {e}")

        # Emit an error message to the client
        emit('error', {'error': f"Translation failed: {str(e)}"})

@app.route('/')
def home():
    return "Chat Translation API is running."

if __name__ == '__main__':
    # Start the Socket.IO server
    socketio.run(app, debug=True)
