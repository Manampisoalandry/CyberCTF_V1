from pathlib import Path
import random

FLAG = "REDACTED"
KEY_MIN = 1
KEY_MAX = 80
PARTS = 4

vals = [ord(c) for c in FLAG]
n = len(vals)

sizes = [n // PARTS] * PARTS
for i in range(n % PARTS):
    sizes[i] += 1

chunks = []
p = 0
for s in sizes:
    chunks.append(vals[p:p + s])
    p += s

keys = [random.randint(KEY_MIN, KEY_MAX) for _ in range(PARTS)]

enc = bytearray()
for part_idx, chunk in enumerate(chunks):
    k = keys[part_idx]
    for i, v in enumerate(chunk):
        x = (v + i) & 255
        x ^= k
        enc.append(x)

Path("challenge.bin").write_bytes(bytes(enc))
print(bytes(enc).hex())
print(keys)
print(sizes)