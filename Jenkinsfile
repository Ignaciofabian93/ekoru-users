pipeline {
  agent none

  environment {
    SERVICE_NAME = 'ekoru-users'
  }

  stages {

    stage('Install') {
      agent {
        docker {
          image 'node:22-alpine'
          args '-u root'
        }
      }
      steps {
        sh 'npm ci'
      }
    }

    stage('Prisma Generate') {
      agent {
        docker {
          image 'node:22-alpine'
          args '-u root'
        }
      }
      steps {
        sh 'npm run prisma:gen'
      }
    }

    stage('Build') {
      agent {
        docker {
          image 'node:22-alpine'
          args '-u root'
        }
      }
      steps {
        sh 'npm run build'
      }
    }

    stage('Test') {
      agent {
        docker {
          image 'node:22-alpine'
          args '-u root'
        }
      }
      steps {
        sh 'npm test -- --passWithNoTests'
      }
    }

    // ── Staging flow ──────────────────────────────────────────────────────────

    stage('Deploy Staging') {
      agent any
      when { branch 'staging' }
      steps {
        sh '''
          cp /opt/ekoru/secrets/ekoru-users/.env.staging ${WORKSPACE}/.env.staging
          docker compose -f compose.staging.yml build --no-cache
          docker compose -f compose.staging.yml up -d --force-recreate
          docker image prune -f
        '''
      }
    }

    stage('E2E Tests') {
      agent {
        docker {
          image 'node:22-alpine'
          args '-u root'
        }
      }
      when { branch 'staging' }
      steps {
        sh 'npm run test:e2e'
      }
    }

    // ── Manual gate (staging → prod, or hotfix main → prod) ───────────────────

    stage('Approve Production Deploy') {
      agent none
      when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        timeout(time: 24, unit: 'HOURS') {
          input message: "Deploy ${SERVICE_NAME} to production? (branch: ${env.BRANCH_NAME})",
                ok: 'Deploy to Production'
        }
      }
    }

    // ── Production deploy ─────────────────────────────────────────────────────

    stage('Deploy Production') {
      agent any
      when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        sh '''
          cp /opt/ekoru/secrets/ekoru-users/.env.prod ${WORKSPACE}/.env.prod
          docker compose -f compose.prod.yml build --no-cache
          docker compose -f compose.prod.yml up -d --force-recreate
          docker image prune -f
        '''
      }
    }

  }

  post {
      failure {
          echo "Pipeline failed for ${SERVICE_NAME} on branch ${env.BRANCH_NAME}"
      }
      success {
          echo "Pipeline completed for ${SERVICE_NAME} (${env.BRANCH_NAME}) — commit ${env.GIT_COMMIT}"
      }
  }
}
