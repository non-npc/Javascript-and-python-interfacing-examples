# Javascript-and-python-interfacing-examples
Examples of interfacing between javascript and python for desktop apps and games without requiring a localhost server component.

You can achieve the same functionality as eel by using PyQt6's QWebEngineView in combination with QWebChannel to create a bridge between Python and JavaScript. 
This allows you to embed an HTML/JS frontend inside a PyQt6-based desktop app and call Python functions from JavaScript (and vice versa).

# How This Works:
**QWebEngineView:** A browser component inside PyQt6 that can render HTML, CSS, and JavaScript.

**QWebChannel:** A communication bridge that lets JavaScript call Python functions directly.

**Python acts as the backend**, while **HTML/JavaScript provide the frontend**.
