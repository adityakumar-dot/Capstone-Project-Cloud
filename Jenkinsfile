// // Jenkinsfile
// pipeline {
//     agent any

//     environment {
//         AWS_REGION         = 'ap-south-1'
//         ECR_REGISTRY       = '483591406306.dkr.ecr.ap-south-1.amazonaws.com'
//         PRIVATE_EC2_IP     = '10.0.2.32'
//         S3_BUCKET          = 'project-frontend-483591406306'
//         IMAGE_TAG          = "${BUILD_NUMBER}"
//     }

//     tools {
//         nodejs 'NodeJS-20'
//     }

//     stages {

//         stage('Checkout') {
//             steps {
//                 echo '==> Checking out code from GitHub...'
//                 checkout scm
//             }
//         }

//         stage('Build Frontend') {
//             steps {
//                 echo '==> Building React frontend...'
//                 dir('frontend') {
//                     sh 'npm install'
//                     sh 'npm run build'
//                 }
//             }
//         }

//         stage('Upload Frontend to S3') {
//             steps {
//                 echo '==> Uploading React build to S3...'
//                 sh """
//                     aws s3 sync frontend/dist/ s3://${S3_BUCKET}/ \
//                         --region ${AWS_REGION} \
//                         --delete \
//                         --cache-control max-age=86400
//                 """
//             }
//         }

//         stage('Build Docker Images') {
//             steps {
//                 echo '==> Building Docker images...'
//                 sh """
//                     docker build -t ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG} \
//                         ./backend/python-fastapi

//                     docker build -t ${ECR_REGISTRY}/nodejs:${IMAGE_TAG} \
//                         ./backend/nodejs

//                     docker build -t ${ECR_REGISTRY}/python-django:${IMAGE_TAG} \
//                         ./backend/python-django

//                     docker build -t ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG} \
//                         ./backend/dotnet-webapi
//                 """
//             }
//         }

//         stage('Push Images to ECR') {
//             steps {
//                 echo '==> Logging into ECR and pushing images...'
//                 sh """
//                     aws ecr get-login-password --region ${AWS_REGION} | \
//                         docker login --username AWS \
//                         --password-stdin ${ECR_REGISTRY}

//                     docker push ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG}
//                     docker push ${ECR_REGISTRY}/nodejs:${IMAGE_TAG}
//                     docker push ${ECR_REGISTRY}/python-django:${IMAGE_TAG}
//                     docker push ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG}
//                 """
//             }
//         }

//         stage('Deploy to Private EC2') {
//             steps {
//                 echo '==> Deploying to backend server...'
//                 sshagent(credentials: ['backend-ssh-key']) {
//                     sh """
//                         ssh -o StrictHostKeyChecking=no \
//                             ubuntu@${PRIVATE_EC2_IP} \
//                             'bash ~/project/deploy.sh ${ECR_REGISTRY} ${IMAGE_TAG}'
//                     """
//                 }
//             }
//         }

//     }

//     post {
//         success {
//             echo '==> Pipeline SUCCESS - All stages completed!'
//         }
//         failure {
//             echo '==> Pipeline FAILED - Check logs above!'
//         }
//         always {
//             echo '==> Cleaning up local Docker images...'
//             sh """
//                 docker rmi ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG} || true
//                 docker rmi ${ECR_REGISTRY}/nodejs:${IMAGE_TAG} || true
//                 docker rmi ${ECR_REGISTRY}/python-django:${IMAGE_TAG} || true
//                 docker rmi ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG} || true
//             """
//         }
//     }
// }




// With Rolling back jenkins file

pipeline {
    agent any

    environment {
        AWS_REGION         = 'ap-south-1'
        ECR_REGISTRY       = '483591406306.dkr.ecr.ap-south-1.amazonaws.com'
        PRIVATE_EC2_IP     = '10.0.2.32'
        S3_BUCKET          = 'project-frontend-483591406306'
        IMAGE_TAG          = "${BUILD_NUMBER}"
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
                    docker build -t ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG} \
                        ./backend/python-fastapi

                    docker build -t ${ECR_REGISTRY}/nodejs:${IMAGE_TAG} \
                        ./backend/nodejs

                    docker build -t ${ECR_REGISTRY}/python-django:${IMAGE_TAG} \
                        ./backend/python-django

                    docker build -t ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG} \
                        ./backend/dotnet-webapi
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

        stage('Deploy to Private EC2') {
            steps {
                echo '==> Deploying with rolling update...'
                sshagent(credentials: ['backend-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no \
                            ubuntu@${PRIVATE_EC2_IP} \
                            'bash ~/project/deploy.sh ${ECR_REGISTRY} ${IMAGE_TAG}'
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                echo '==> Running final health check via ALB...'
                sh """
                    sleep 15
                    curl -f http://project-alb-295252674.ap-south-1.elb.amazonaws.com/health || exit 1
                    echo "Health check passed!"
                """
            }
        }

    }

    post {
        success {
            echo """
            ==> DEPLOYMENT SUCCESS
            ==> Build:    ${BUILD_NUMBER}
            ==> Image:    ${ECR_REGISTRY}/*:${IMAGE_TAG}
            ==> Time:     ${new Date()}
            """
        }
        failure {
            echo """
            ==> DEPLOYMENT FAILED
            ==> Build:    ${BUILD_NUMBER}
            ==> Rollback was triggered automatically on EC2
            ==> Check logs above for details
            """
        }
        always {
            echo '==> Cleaning up local Docker images on Jenkins...'
            sh """
                docker rmi ${ECR_REGISTRY}/python-fastapi:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/nodejs:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/python-django:${IMAGE_TAG} || true
                docker rmi ${ECR_REGISTRY}/dotnet-webapi:${IMAGE_TAG} || true
            """
        }
    }
}