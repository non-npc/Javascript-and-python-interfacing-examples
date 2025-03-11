import sys
import os
import json
from pathlib import Path
from PyQt6.QtWidgets import QApplication, QMainWindow, QFileDialog
from PyQt6.QtCore import QObject, pyqtSlot, QThread, pyqtSignal, QUrl
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel
import time

class Worker(QThread):
    finished = pyqtSignal(str, str)  # Signal to emit results (task_id, result)
    
    def __init__(self, task_id, duration):
        super().__init__()
        self.task_id = task_id
        self.duration = duration
        
    def run(self):
        # Simulate some work
        time.sleep(self.duration)
        result = f"Task {self.task_id} completed after {self.duration} seconds!"
        self.finished.emit(self.task_id, result)

class Bridge(QObject):
    def __init__(self, web_view):
        super().__init__()
        self.workers = {}
        self.web_view = web_view  # Store reference to WebView
    
    @pyqtSlot(str, result=str)
    def echo(self, message):
        """Simple echo function to demonstrate basic communication"""
        return f"Python received: {message}"
    
    @pyqtSlot(str, float)
    def startLongTask(self, task_id, duration):
        """Start a long-running task in a separate thread"""
        worker = Worker(task_id, duration)
        worker.finished.connect(self.onTaskFinished)
        self.workers[task_id] = worker
        worker.start()
    
    @pyqtSlot(str, str)
    def onTaskFinished(self, task_id, result):
        """Called when a worker thread finishes"""
        if task_id in self.workers:
            del self.workers[task_id]
            # Use the stored WebView reference to run JavaScript
            self.web_view.page().runJavaScript(
                f'if (bridge && typeof bridge.taskCompleted === "function") {{ bridge.taskCompleted("{task_id}", "{result}"); }}'
            )
    
    @pyqtSlot(str, result=str)
    def processData(self, json_str):
        """Process JSON data received as a string"""
        try:
            # Parse the JSON string to Python dict
            data = json.loads(json_str)
            
            # Process the data
            result = {
                "received": data,
                "timestamp": time.time(),
                "processed": True
            }
            
            # Convert back to JSON string
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"error": str(e)})
    
    @pyqtSlot(str)
    def saveGameState(self, game_state_json):
        """Save game state to a file"""
        try:
            # Open file dialog to get save location
            file_path, _ = QFileDialog.getSaveFileName(
                self.web_view.window(),
                "Save Game State",
                os.path.join(os.path.expanduser("~"), "game_save.json"),
                "JSON Files (*.json)"
            )
            
            if file_path:
                with open(file_path, 'w') as f:
                    # Parse and re-stringify to format the JSON nicely
                    game_state = json.loads(game_state_json)
                    json.dump(game_state, f, indent=2)
                
                print(f"Game state saved to {file_path}")
                
                # Notify JavaScript that save was successful
                self.web_view.page().runJavaScript(
                    'console.log("Game saved successfully");'
                )
        except Exception as e:
            print(f"Error saving game state: {e}")
            # Notify JavaScript of the error
            self.web_view.page().runJavaScript(
                f'console.error("Error saving game: {str(e)}");'
            )
    
    @pyqtSlot(result=str)
    def loadGameState(self):
        """Load game state from a file"""
        try:
            # Open file dialog to get file location
            file_path, _ = QFileDialog.getOpenFileName(
                self.web_view.window(),
                "Load Game State",
                os.path.expanduser("~"),
                "JSON Files (*.json)"
            )
            
            if file_path:
                with open(file_path, 'r') as f:
                    game_state_json = f.read()
                
                print(f"Game state loaded from {file_path}")
                
                # Start a task to return the game state
                task_id = "loadGameState"
                self.web_view.page().runJavaScript(
                    f'if (bridge && typeof bridge.taskCompleted === "function") {{ bridge.taskCompleted("{task_id}", {json.dumps(game_state_json)}); }}'
                )
                
                return game_state_json
            else:
                return ""
        except Exception as e:
            print(f"Error loading game state: {e}")
            return json.dumps({"error": str(e)})

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Javascript and python interfacing examples")
        self.setGeometry(100, 100, 1280, 720)
        
        # Center the window
        screen = QApplication.primaryScreen().geometry()
        self.move(
            (screen.width() - self.width()) // 2,
            (screen.height() - self.height()) // 2
        )
        
        # Create WebView
        self.web = QWebEngineView()
        self.setCentralWidget(self.web)
        
        # Set up WebChannel
        self.channel = QWebChannel()
        self.bridge = Bridge(self.web)  # Pass WebView reference to Bridge
        self.channel.registerObject("bridge", self.bridge)
        self.web.page().setWebChannel(self.channel)
        
        # Load the local HTML file from appdata
        self.appdata_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "appdata")
        self.load_html_file("game_demo.html")
    
    def load_html_file(self, html_filename):
        """Load an HTML file from the appdata directory"""
        html_path = os.path.join(self.appdata_path, html_filename)
        if os.path.exists(html_path):
            self.web.setUrl(QUrl.fromLocalFile(html_path))
        else:
            print(f"Error: HTML file not found: {html_path}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    
    window.show()
    sys.exit(app.exec()) 