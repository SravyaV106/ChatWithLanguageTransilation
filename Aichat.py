from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from deep_translator import GoogleTranslator
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('send_message')
def handle_message(data):
    """
    Handles incoming messages, translates them to the specified language,
    and emits the translation back to the client.
    """
    try:
        # Extract original text and target language from the request
        original_text = data.get('message')
        target_language = data.get('target_language', 'te')  # Default to Telugu if not provided

        if not original_text:
            raise ValueError("Message content is missing.")
        if not target_language:
            raise ValueError("Target language is missing.")

        # Log the received message and target language
        print(f"Original message: {original_text}")
        print(f"Target language: {target_language}")

        # Perform translation using GoogleTranslator
        translated_text = GoogleTranslator(source='auto', target=target_language).translate(original_text)

        # Log the translated text
        print(f"Translated text: {translated_text}")

        # Prepare the response object
        response = {
            'original_text': original_text,
            'translated_text': translated_text,
            'target_language': target_language,
        }

        # Emit the translated message back to the client
        emit('receive_message', response, broadcast=True)

    except Exception as e:
        # Log and send error information back to the client
        print(f"Error during translation: {e}")
        emit('error', {'error': f"Translation failed: {str(e)}"})

@app.route('/languages', methods=['GET'])
def get_supported_languages():
    """
    Endpoint to return a list of supported languages for translation.
    """
    try:
        # Fetch the list of supported languages
        languages = GoogleTranslator.get_supported_languages(as_dict=True)
        return jsonify({'languages': languages}), 200
    except Exception as e:
        print(f"Error fetching supported languages: {e}")
        return jsonify({'error': 'Failed to fetch supported languages'}), 500

@app.route('/')
def home():
    """
    Default endpoint to confirm the API is running.
    """
    return "Chat Translation API is running."

if __name__ == '__main__':
    # Start the Flask Socket.IO server
    socketio.run(app, debug=True)
