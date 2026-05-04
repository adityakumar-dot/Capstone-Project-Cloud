pipeline {
    agent any

    environment {
        AWS_REGION     = 'ap-south-1'
        ECR_REGISTRY   = '483591406306.dkr.ecr.ap-south-1.amazonaws.com'
        PRIVATE_EC2_IP = '10.0.2.32'
        S3_BUCKET      = 'project-frontend-483591406306'
        IMAGE_TAG      = "${BUILD_NUMBER}"
        PROJECT_DIR    = '/home/ubuntu/project'
    }

    tools {
        nodejs 'NodeJS-20'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '==> Checking out code from GitHub...'
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                echo '==> Building React frontend...'
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Upload Frontend to S3') {
            steps {
                sh """
                    aws s3 sync frontend/dist/ s3://${S3_BUCKET}/ \
                    --region ${AWS_REGION} \
                    --delete \
                    --cache-control max-age=86400
                """
            }
        }

        stage('Build Docker Images') {
            steps {
                sh """
                    docker build -t ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG} ./backend/python-fastapi
                    docker build -t ${ECR_REGISTRY}/nodejs:${IMAGE_TAG} ./backend/nodejs
                    docker build -t ${ECR_REGISTRY}/python-django:${IMAGE_TAG} ./backend/python-django
                    docker build -t ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG} ./backend/dotnet-webapi
                """
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

                    docker push ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/nodejs:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/python-django:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG}
                """
            }
        }

        stage('Copy Config Files to EC2') {
            steps {
                sshagent(credentials: ['backend-ssh-key']) {
                    sh """
ssh -o StrictHostKeyChecking=no ubuntu@${PRIVATE_EC2_IP} << 'ENDSSH'
set -e
mkdir -p ${PROJECT_DIR}/monitoring/prometheus
mkdir -p ${PROJECT_DIR}/monitoring/alertmanager
mkdir -p ${PROJECT_DIR}/monitoring/grafana/provisioning/dashboards
mkdir -p ${PROJECT_DIR}/monitoring/grafana/provisioning/datasources

rm -rf ${PROJECT_DIR}/monitoring/prometheus/prometheus.yml || true
rm -rf ${PROJECT_DIR}/monitoring/prometheus/alerts.yml || true
rm -rf ${PROJECT_DIR}/monitoring/alertmanager/alertmanager.yml || true
rm -rf ${PROJECT_DIR}/monitoring/grafana/provisioning/datasources/prometheus.yml || true
rm -rf ${PROJECT_DIR}/monitoring/grafana/provisioning/dashboards/default.yml || true

echo "==> Directories ready"
ENDSSH

scp -o StrictHostKeyChecking=no nginx.conf ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/nginx.conf
scp -o StrictHostKeyChecking=no compose.yaml ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/compose.yaml

scp -o StrictHostKeyChecking=no monitoring/prometheus/prometheus.yml ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/monitoring/prometheus/prometheus.yml
scp -o StrictHostKeyChecking=no monitoring/prometheus/alerts.yml ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/monitoring/prometheus/alerts.yml

scp -o StrictHostKeyChecking=no monitoring/alertmanager/alertmanager.yml ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/monitoring/alertmanager/alertmanager.yml

scp -o StrictHostKeyChecking=no monitoring/grafana/provisioning/datasources/prometheus.yml ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/monitoring/grafana/provisioning/datasources/prometheus.yml

scp -o StrictHostKeyChecking=no monitoring/grafana/provisioning/dashboards/default.yml ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/monitoring/grafana/provisioning/dashboards/default.yml

scp -o StrictHostKeyChecking=no monitoring/grafana/provisioning/dashboards/*.json ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/monitoring/grafana/provisioning/dashboards/

echo "==> All files copied successfully"
"""
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(credentials: ['backend-ssh-key']) {
                    sh """
ssh -o StrictHostKeyChecking=no ubuntu@${PRIVATE_EC2_IP} << EOF
set -e

aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

cd ${PROJECT_DIR}
docker compose down
docker compose up -d

docker compose ps
EOF
"""
                }
            }
        }
    }

    post {
        always {
            sh """
                docker rmi ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/nodejs:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/python-django:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG} || true
            """
        }
    }
}