from flask_socketio import SocketIO
socketio = SocketIO(async_mode="threading", logger=False, engineio_logger=False)