from pathlib import Path

FLAG = b"REDACTED"
BLOCK = 4

tmp = bytearray()
for b in FLAG:
    if 65 <= b <= 90:
        tmp.append(90 - (b - 65))
    elif 97 <= b <= 122:
        tmp.append(122 - (b - 97))
    else:
        tmp.append(b)

enc = bytearray()
for i in range(0, len(tmp), BLOCK):
    enc.extend(tmp[i:i + BLOCK][::-1])

Path("challenge.bin").write_bytes(bytes(enc))
print(bytes(enc).hex())