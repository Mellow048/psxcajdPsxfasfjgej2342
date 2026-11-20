#!/usr/bin/env python3
"""Compose 'Neon Current': an eight-bar PSX synth groove. Python stdlib only."""
import argparse
from array import array
from math import exp, pi, sin, tanh
from pathlib import Path
from random import Random
import sys
import wave

RATE = 24000
TAU = 2 * pi


def compose(bpm=128, seed=17):
    rng = Random(seed)
    # Round only the final sample positions so the downbeat never drifts.
    beat = RATE * 60 / bpm
    n = round(32 * beat)
    bus = array('f', [0]) * n

    def add(pos, sample):
        bus[pos % n] += sample  # wrap the tails for seamless looping

    def note(start, midi, beats, gain, instrument):
        pos, length = round(start * beat), round(beats * beat)
        hz = 440 * 2 ** ((midi - 69) / 12)
        for i in range(length):
            t, phase = i / RATE, TAU * hz * i / RATE
            gate = min(1, i / 120, (length - 1 - i) / 480)
            if instrument == 'bass':
                sound = sin(phase) + .25 * sin(2 * phase) * exp(-8*t)
                env = .6 + .4 * exp(-9*t)
            else:
                # Soft FM attack, with the overtones decaying before the body.
                sound = sin(phase + 1.2 * exp(-15*t) * sin(2*phase))
                env = exp(-5.3*t)
            v = gain * gate * env * sound
            add(pos + i, v)
            if instrument == 'keys':
                add(pos + i + round(.75 * beat), .16 * v)
                add(pos + i + round(1.5 * beat), .05 * v)

    def drum(start, kind, gain):
        pos = round(start * beat)
        duration = {'kick': .21, 'snare': .14, 'hat': .055}[kind]
        prev = 0
        for i in range(round(RATE * duration)):
            t = i / RATE
            noise = rng.uniform(-1, 1)
            if kind == 'kick':
                v = sin(TAU*(48*t + 2.4*(1-exp(-38*t)))) * exp(-19*t)
            elif kind == 'snare':
                v = .66*(noise-prev)*exp(-37*t) + .34*sin(TAU*185*t)*exp(-32*t)
            else:
                v = (noise-prev)*exp(-86*t)
            prev = noise
            add(pos+i, gain*v*min(1, i/24, (duration-t)*500))

    # F#m9 – Dmaj7 – Aadd9 – E6. Two passes; a different answer in bars 7–8.
    chords = [(42, (57,61,66,68)), (38, (54,57,61,64)),
              (45, (57,59,61,64)), (40, (56,59,61,64))]
    for bar in range(8):
        down = 4*bar
        root, voices = chords[bar % 4]
        for when in (0, 2.5 if bar % 2 else 2):
            drum(down+when, 'kick', .48)
        for when in (1,3):
            drum(down+when, 'snare', .17)
        for k in range(8):
            drum(down + k/2 + .035*(k%2), 'hat', .072 if k%2 else .046)
        for when,interval,length in [(0,0,.72),(1.5,7,.33),(2,0,.6),(3.5,12,.35)]:
            note(down+when, root+interval, length, .26, 'bass')
        for k, when in enumerate((.53,1.78,2.53)):
            note(down+when, voices[(bar+k)%4], .65, .17, 'keys')
        if bar in (3,7):
            note(down+3.25, voices[2]+12, .35, .1, 'keys')
            note(down+3.75, voices[0]+12, .38, .09, 'keys')
    peak = max(abs(x) for x in bus)
    pcm = array('h', (round(23500 * tanh(1.2*x/peak) / tanh(1.2)) for x in bus))
    if sys.byteorder != 'little':
        pcm.byteswap()
    return pcm.tobytes()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, nargs='?', default=Path('episodes/neon-current.wav'))
    parser.add_argument('--bpm', type=int, default=128)
    parser.add_argument('--seed', type=int, default=17, help='Drum noise seed')
    args = parser.parse_args()
    if not 60 <= args.bpm <= 200:
        parser.error('--bpm must be 60–200')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(args.output), 'wb') as dest:
        dest.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        dest.writeframes(compose(args.bpm, args.seed))
    print(f'{args.output}: 8 bars at {args.bpm} BPM ({32*60/args.bpm:g} seconds)')


if __name__ == '__main__':
    main()
