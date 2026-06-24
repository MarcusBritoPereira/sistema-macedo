import os
import pty
import sys
import time

def run_ssh(command, password):
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp('ssh', ['ssh', '-o', 'StrictHostKeyChecking=no', 'sistema-macedo', command])
    else:
        output = b""
        password_sent = False
        while True:
            try:
                data = os.read(fd, 1024)
                if not data:
                    break
                output += data
                sys.stdout.buffer.write(data)
                sys.stdout.flush()
                
                if b"password:" in data.lower() and not password_sent:
                    time.sleep(0.2)
                    os.write(fd, password.encode() + b"\n")
                    password_sent = True
            except OSError:
                break
        
        _, status = os.waitpid(pid, 0)
        return status

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'echo "SSH OK"'
    pw = "w(1dD58A;?/OgNxC"
    run_ssh(cmd, pw)
