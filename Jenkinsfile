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
                        scp -r -o StrictHostKeyChecking=no \
                            compose.yaml nginx.conf monitoring \
                            ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/
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

sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|" ${PROJECT_DIR}/.env
sed -i "s|ECR_REGISTRY=.*|ECR_REGISTRY=${ECR_REGISTRY}|" ${PROJECT_DIR}/.env

cd ${PROJECT_DIR}
docker compose down
docker compose up -d

echo "==> Deploy complete: ${IMAGE_TAG}"
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