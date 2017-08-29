# To capture screenshot over a period of time
#!/bin/sh
cd /home/vinodh/
rm -rf screenshot/
mkdir screenshot/
for i in `seq 1 2`;
do scrot -d 2  "/home/vinodh/screenshot/${i}.jpg" -q 40;
done
