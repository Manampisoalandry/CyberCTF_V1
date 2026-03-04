from pathlib import Path
import random

FLAG = b"REDACTED"
KEY_MIN = 1
KEY_MAX = 80
KEY = random.randint(KEY_MIN, KEY_MAX)

data = bytes((((b + 2) & 255) ^ KEY) for b in FLAG)
Path("challenge.bin").write_bytes(data)
print(data.hex())
print(KEY)