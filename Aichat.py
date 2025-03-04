from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from deep_translator import GoogleTranslator
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('send_message')
def handle_message(data):
    """
    Handles incoming messages, translates them to the specified language,
    and emits the translation back to the client.
    """
    try:
        original_text = data.get('message')
        target_language = data.get('targetLanguage', 'te')  # Default: Telugu

        if not original_text:
            return emit('error', {'error': "Message content is missing."}, broadcast=False)
        if not target_language:
            return emit('error', {'error': "Target language is missing."}, broadcast=False)

        print(f"[Received] Message: {original_text} | Target: {target_language}")

        # Perform translation
        translated_text = GoogleTranslator(source='auto', target=target_language).translate(original_text)

        print(f"[Translated] {translated_text}")

        response = {
            'original_text': original_text,
            'translated_text': translated_text,
            'target_language': target_language,
        }

        emit('receive_message', response, broadcast=True)

    except Exception as e:
        print(f"[Error] Translation failed: {e}")
        emit('error', {'error': f"Translation failed: {str(e)}"}, broadcast=False)

@app.route('/languages', methods=['GET'])
def get_supported_languages():
    """
    Returns a list of supported languages for translation.
    """
    try:
        languages = GoogleTranslator.get_supported_languages()
        return jsonify({'languages': languages}), 200
    except Exception as e:
        print(f"[Error] Failed to fetch supported languages: {e}")
        return jsonify({'error': 'Failed to fetch supported languages'}), 500

@app.route('/')
def home():
    """Default API status check."""
    return "Chat Translation API is running."

if __name__ == '__main__':
    print("[INFO] Starting Chat Translation API...")
    socketio.run(app, host='127.0.0.1', port=5000)
