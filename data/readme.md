Run rabbitmq
docker run -it --rm --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:4.0-management


Run minio
docker run -p 9000:9000 -p 9001:9001 --name minio -v ~/minio/data:/data -e "S3_ACCESS_KEY=ROOTNAME" -e "S3_SECRET_KEY=CHANGEME123" quay.io/minio/minio server /data --console-address ":9001"