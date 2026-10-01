#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Пітоніка / PythonJunior - Сервер навчальної платформи
Запускається стандартним Python 3 без встановлення жодних сторонніх пакетів!
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class PythonSchoolHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Додаємо заголовки проти кешування для легкої розробки
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        # API для збереження даних на диск
        if self.path == '/api/save-lessons':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                target_file = os.path.join(DIRECTORY, 'data', 'lessons.json')
                os.makedirs(os.path.dirname(target_file), exist_ok=True)
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
                return

        super().do_POST()

def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), PythonSchoolHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("🐍 НАВЧАЛЬНА ПЛАТФОРМА ОСНОВ PYTHON ДЛЯ ШКОЛЯРІВ")
        print(f"🚀 Сервер успішно запущено за адресою: {url}")
        print("💡 Відкрийте цю адресу у будь-якому браузері (Chrome, Edge, Firefox).")
        print("🛑 Для зупинки сервера натисніть Ctrl+C у цьому вікні.")
        print("=" * 60)
        
        # Автоматичне відкриття у браузері
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер зупинено.")

if __name__ == '__main__':
    main()
