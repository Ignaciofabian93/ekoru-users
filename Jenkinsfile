pipeline {
  agent any

  environment {
    SERVICE_NAME = 'ekoru-users'
  }

  stages {

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Prisma Generate') {
      steps {
        sh 'npm run prisma:gen'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Test') {
      steps {
        sh 'npm test -- --passWithNoTests'
      }
    }

    // ── Staging flow ──────────────────────────────────────────────────────────

    stage('Deploy Staging') {
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
      when { branch 'staging' }
      steps {
        sh 'npm run test:e2e'
      }
    }

    // ── Manual gate (staging → prod, or hotfix main → prod) ───────────────────

    stage('Approve Production Deploy') {
      when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        timeout(time: 24, unit: 'HOURS') {
          input message: "Deploy ${SERVICE_NAME} to production? (commit: ${GIT_COMMIT})",
                ok: 'Deploy to Production'
        }
      }
    }

    // ── Production deploy ─────────────────────────────────────────────────────

    stage('Deploy Production') {
      when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        sh '''
          cp /opt/ekoru/secrets/ekoru-users/.env.staging ${WORKSPACE}/.env.staging
          docker compose -f compose.prod.yml build --no-cache
          docker compose -f compose.prod.yml up -d --force-recreate
          docker image prune -f
        '''
      }
    }

  }

  post {
    failure {
      echo "Pipeline failed for ${SERVICE_NAME} on branch ${GIT_BRANCH}"
    }
    success {
      echo "Pipeline completed for ${SERVICE_NAME} (${GIT_BRANCH}) — commit ${GIT_COMMIT}"
    }
  }
}
