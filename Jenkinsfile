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
                            compose.yaml nginx.conf monitoring monitoring.yaml \
                            ubuntu@${PRIVATE_EC2_IP}:${PROJECT_DIR}/
                    """
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(credentials: ['backend-ssh-key']) {
                    sh '''
ssh -o StrictHostKeyChecking=no ubuntu@''' + PRIVATE_EC2_IP + ''' << 'EOF'
set -e

AWS_REGION="''' + AWS_REGION + '''"
ECR_REGISTRY="''' + ECR_REGISTRY + '''"
IMAGE_TAG="''' + IMAGE_TAG + '''"
PROJECT_DIR="''' + PROJECT_DIR + '''"

echo "==> Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo "==> Fetching secrets from AWS..."

SECRET_JSON=$(aws secretsmanager get-secret-value \
    --region $AWS_REGION \
    --secret-id project/db-credentials \
    --query SecretString \
    --output text)

# ✅ Fail fast if secret fetch fails
if [ -z "$SECRET_JSON" ]; then
    echo "❌ Failed to fetch secrets from AWS Secrets Manager"
    exit 1
fi

echo "$SECRET_JSON" > secret.json

echo "==> Creating .env file..."

python3 - <<PYEOF
import json

with open("secret.json") as f:
    data = json.load(f)

with open(".env", "w") as f:
    for k, v in data.items():
        f.write(f"{k}={v}\\n")

with open(".env", "a") as f:
    f.write("ECR_REGISTRY=" + "$ECR_REGISTRY" + "\\n")
    f.write("IMAGE_TAG=" + "$IMAGE_TAG" + "\\n")
PYEOF

rm -f secret.json

echo "==> Moving .env to project directory..."
mv .env $PROJECT_DIR/.env

echo "==> Starting containers..."
cd $PROJECT_DIR
docker compose up -d --wait --remove-orphans

echo "==> Reloading nginx..."
docker exec nginx nginx -s reload || true

docker compose -f monitoring.yaml up -d --wait

echo "==> Deploy complete: $IMAGE_TAG"
EOF
'''
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