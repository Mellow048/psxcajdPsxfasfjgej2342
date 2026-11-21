"""Score One Human on Mars: a low pulse, soft percussion, and a four-note home motif."""
from array import array
from math import exp, sin, tau
from pathlib import Path
from random import Random
import json, sys, wave

root = Path(__file__).resolve().parents[1]
episode = json.loads((root/'episodes/mars.json').read_text())
rate = 24000
end = sum(x['duration'] for x in episode['shots'])
bus = array('f', [0]) * round(end*rate)
rng = Random(203)

def note(t, length, hz, amp, voice):
    start = round(t*rate)
    for i in range(min(round(length*rate), len(bus)-start)):
        s = i/rate
        env = min(1, s/.012, (length-s)/.055)
        if voice == 'kick':
            v = sin(tau*(50*s+1.5*(1-exp(-42*s))))*exp(-18*s)
        elif voice == 'brush':
            v = rng.uniform(-1,1)*exp(-54*s)
        else:
            p = tau*hz*s
            v = (sin(p)+.21*sin(2*p)+.09*sin(3*p))*exp(-(2.6 if voice=='keys' else 4.0)*s)
        bus[start+i] += v*amp*env

beat = 60/118
for j in range(int(end/(4*beat))+1):
    t = j*4*beat
    if 18.5<t<22.4: continue  # leave the failed attempt and rewind some space
    hz = [73.42,58.27,65.41,55.0][j%4]
    for offset in ([0,2.5] if t<44 else [0,1.5,2.5]):
        note(t+offset*beat,.46,hz,.38,'bass')
    for offset in (0,2):note(t+offset*beat,.23,0,.35,'kick')
    for offset in (1,3):note(t+offset*beat,.11,0,.15,'brush')
    for k in range(2 if t<55 else 3):
        note(t+(.5+k)*beat,.85,hz*[4,5,6][(j+k)%3],.11,'keys')

pcm = array('h',(round(30500*max(-1,min(1,x))*max(0,min(1,(end-i/rate)/.40))) for i,x in enumerate(bus)))
if sys.byteorder!='little':pcm.byteswap()
with wave.open(str(root/episode['music']['track']),'wb') as w:
    w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(pcm.tobytes())
