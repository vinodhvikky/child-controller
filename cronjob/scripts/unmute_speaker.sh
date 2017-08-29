#!/bin/sh
sudo usermod -aG pulse,pulse-access vinodh
sudo killall pulseaudio
pulseaudio -D
pacmd set-sink-volume 0 45000
pacmd set-sink-volume 1 45000
pacmd set-sink-mute 0 0
pacmd set-sink-mute 1 0
