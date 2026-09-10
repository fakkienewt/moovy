import threading
from DataBase.UpdateDB import app, db
import Parsing.IframeParser as IframeService

def start_iframe_parser():
    with app.app_context():
        db.create_all()
    IframeService.app.run(debug=False, port=5001, use_reloader=False)

if __name__ == '__main__':
    thread = threading.Thread(target=start_iframe_parser, daemon=True)
    thread.start()

    print("Основной бэкенд запущен на порту 5000")
    print("Сервис плееров запущен на порту 5001")

    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)