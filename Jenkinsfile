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
                echo '==> Uploading React build to S3...'
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
                echo '==> Building Docker images...'
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
                echo '==> Pushing images to ECR...'
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS \
                        --password-stdin ${ECR_REGISTRY}

                    docker push ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/nodejs:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/python-django:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG}
                """
            }
        }

        stage('Copy Config Files to EC2') {
            steps {
                echo '==> Copying nginx.conf, docker-compose.yaml and monitoring folder to EC2...'
                sshagent(credentials: ['backend-ssh-key']) {
                    sh """
                        # Create project directories on EC2
                        ssh -o StrictHostKeyChecking=no ubuntu@${PRIVATE_EC2_IP} \
                            'mkdir -p ${PROJECT_DIR}/monitoring'

                        # Copy nginx config
                        scp -o StrictHostKeyChecking=no \
                            nginx.conf \
                            ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/nginx.conf

                        # Copy docker compose
                        scp -o StrictHostKeyChecking=no \
                            docker-compose.yaml \
                            ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/docker-compose.yaml

                        # Copy monitoring folder (prometheus, grafana configs)
                        scp -o StrictHostKeyChecking=no -r \
                            monitoring/ \
                            ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/monitoring/
                    """
                }
            }
        }

        stage('Deploy to Private EC2') {
            steps {
                echo '==> Deploying to backend server...'
                sshagent(credentials: ['backend-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@${PRIVATE_EC2_IP} bash << 'EOF'
                            set -e
                            REGION="ap-south-1"
                            ECR_REGISTRY="${ECR_REGISTRY}"
                            IMAGE_TAG="${IMAGE_TAG}"
                            PROJECT_DIR="${PROJECT_DIR}"

                            echo "==> Logging into ECR..."
                            aws ecr get-login-password --region \$REGION | \\
                                docker login --username AWS --password-stdin \$ECR_REGISTRY

                            echo "==> Saving current tag for rollback..."
                            CURRENT_TAG=\$(grep IMAGE_TAG \$PROJECT_DIR/.env | cut -d '=' -f2)
                            echo "==> Current: \$CURRENT_TAG | New: \$IMAGE_TAG"

                            echo "==> Pulling new images..."
                            docker pull \$ECR_REGISTRY/python-fastapi:\$IMAGE_TAG
                            docker pull \$ECR_REGISTRY/nodejs:\$IMAGE_TAG
                            docker pull \$ECR_REGISTRY/python-django:\$IMAGE_TAG
                            docker pull \$ECR_REGISTRY/dotnet-webapi:\$IMAGE_TAG

                            echo "==> Updating .env with new tag..."
                            sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=\$IMAGE_TAG|" \$PROJECT_DIR/.env
                            sed -i "s|ECR_REGISTRY=.*|ECR_REGISTRY=\$ECR_REGISTRY|" \$PROJECT_DIR/.env

                            echo "==> Stopping old containers..."
                            cd \$PROJECT_DIR
                            docker compose down

                            echo "==> Starting new containers..."
                            docker compose up -d

                            echo "==> Waiting for containers to be healthy..."
                            sleep 30

                            echo "==> Checking container health..."
                            HEALTHY=true
                            CONTAINERS=("cloud3tier-fastapi" "cloud3tier-nodejs" "cloud3tier-django" "cloud3tier-dotnet")

                            for CONTAINER in "\${CONTAINERS[@]}"; do
                                STATUS=\$(docker inspect --format='{{.State.Health.Status}}' \$CONTAINER 2>/dev/null || echo "missing")
                                echo "==> \$CONTAINER: \$STATUS"
                                if [ "\$STATUS" != "healthy" ]; then
                                    HEALTHY=false
                                fi
                            done

                            if [ "\$HEALTHY" = false ]; then
                                echo "==> UNHEALTHY! Rolling back to tag: \$CURRENT_TAG"
                                sed -i "s|IMAGE_TAG=.*|IMAGE_TAG=\$CURRENT_TAG|" \$PROJECT_DIR/.env
                                docker compose down
                                docker compose up -d
                                echo "==> Rollback complete. Running on: \$CURRENT_TAG"
                                exit 1
                            fi

                            echo "==> Cleaning up old images..."
                            docker image prune -f

                            echo "==> Running containers:"
                            docker compose ps

                            echo "==> Deploy SUCCESS on tag: \$IMAGE_TAG"
EOF
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                echo '==> Running health check...'
                sshagent(credentials: ['backend-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@${PRIVATE_EC2_IP} \
                            'curl -f http://localhost/health || exit 1'
                    """
                }
            }
        }

    }

    post {
        success {
            echo """
            ================================================
            DEPLOYMENT SUCCESS
            Build:   ${BUILD_NUMBER}
            Tag:     ${IMAGE_TAG}
            ================================================
            """
        }
        failure {
            echo """
            ================================================
            DEPLOYMENT FAILED
            Build:   ${BUILD_NUMBER}
            Rollback triggered automatically on EC2
            ================================================
            """
        }
        always {
            echo '==> Cleaning up Docker images on Jenkins server...'
            sh """
                docker rmi ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/nodejs:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/python-django:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG} || true
            """
        }
    }
}