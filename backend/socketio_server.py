from flask_socketio import SocketIO
socketio = SocketIO(async_mode="eventlet", logger=False, engineio_logger=False)
