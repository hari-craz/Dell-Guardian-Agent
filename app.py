from flask import Flask, request
import os
import datetime

app = Flask(__name__)

SECRET_KEY = "hari1234"

def log(msg):
    t = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{t}] {msg}", flush=True)

def authorized():
    return request.args.get("key") == SECRET_KEY

@app.route('/ping')
def ping():
    log("Ping Request")
    return "DELL_M380_OK"

@app.route('/shutdown')
def shutdown():
    if not authorized():
        log("Unauthorized Shutdown Attempt")
        return "ACCESS_DENIED"

    log("Authorized Shutdown Triggered")
    os.system("shutdown now")
    return "SHUTDOWN_TRIGGERED"

@app.route('/reboot')
def reboot():
    if not authorized():
        log("Unauthorized Reboot Attempt")
        return "ACCESS_DENIED"

    log("Authorized Reboot Triggered")
    os.system("reboot")
    return "REBOOT_TRIGGERED"

if __name__ == '__main__':
    log("Secure Dell Guardian Agent Started")
    app.run(host='0.0.0.0', port=5051)