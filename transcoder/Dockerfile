FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1

RUN apt-get update
RUN apt-get install -y ffmpeg
RUN apt-get clean 
RUN rm -rf /var/lib/apt/lists/*

# WORKDIR /app

# COPY . /app

# COPY requirements.txt /app/requirements.txt
# RUN pip install --no-cache-dir -r requirements.txt

CMD ["bash"]
