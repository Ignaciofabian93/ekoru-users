pipeline {
  agent none

  environment {
    SERVICE_NAME = 'ekoru-users'
  }

  stages {

    // Prevents the version-bump commit from re-triggering the full pipeline
    stage('Skip CI check') {
      agent any
      steps {
        script {
          def msg = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
          if (msg.contains('[skip ci]')) {
            currentBuild.result = 'NOT_BUILT'
            error('Version bump commit — skipping pipeline.')
          }
        }
      }
    }

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

    stage('Bump Version') {
      agent {
        docker {
          image 'node:22-alpine'
          args '-u root'
        }
      }
      when { branch 'main' }
      steps {
        // Install git (not present in node:22-alpine by default) and bump version
        sh '''
          apk add --no-cache git openssh-client
          npm version patch --no-git-tag-version
        '''
        sshagent(['github-deploy-key']) {
          sh '''
            mkdir -p ~/.ssh
            ssh-keyscan github.com >> ~/.ssh/known_hosts
            git config user.email "ci@ekoru.org"
            git config user.name "Jenkins CI"
            VERSION=$(grep -m1 '"version"' package.json | awk -F'"' '{print $4}')
            git add package.json package-lock.json
            git commit -m "ci: bump version to ${VERSION} [skip ci]"
            git tag "v${VERSION}"
            git push origin HEAD:main "v${VERSION}"
          '''
        }
      }
    }

    stage('Deploy Staging') {
      agent any
      when { branch 'main' }
      steps {
        sh '''
          cp /opt/ekoru/secrets/ekoru-users/.env.staging ${WORKSPACE}/.env.staging
          docker compose -f compose.staging.yml build --no-cache
          docker compose -f compose.staging.yml up -d --force-recreate
          docker image prune -f
        '''
        sshagent(['github-deploy-key']) {
          sh '''
            VERSION=$(grep -m1 '"version"' package.json | awk -F'"' '{print $4}')
            git tag "staging/v${VERSION}"
            git push origin "staging/v${VERSION}"
          '''
        }
      }
    }

    stage('Confirm E2E OK') {
      agent none
      when { branch 'main' }
      steps {
        timeout(time: 24, unit: 'HOURS') {
          input message: "Staging deployed for ${SERVICE_NAME}. E2E tests passed?",
                ok: 'Yes, deploy to production'
        }
      }
    }

    // ── Production deploy ─────────────────────────────────────────────────────

    stage('Deploy Production') {
      agent any
      when { branch 'main' }
      steps {
        sh '''
          cp /opt/ekoru/secrets/ekoru-users/.env.prod ${WORKSPACE}/.env.prod
          docker compose -f compose.prod.yml build --no-cache
          docker compose -f compose.prod.yml up -d --force-recreate
          docker image prune -f
        '''
        sshagent(['github-deploy-key']) {
          sh '''
            VERSION=$(grep -m1 '"version"' package.json | awk -F'"' '{print $4}')
            git tag "prod/v${VERSION}"
            git push origin "prod/v${VERSION}"
          '''
        }
      }
    }

  }

  post {
      failure {
          echo "Pipeline failed for ${SERVICE_NAME} on branch ${env.BRANCH_NAME}"
      }
      success {
          echo "Pipeline completed for ${SERVICE_NAME} on ${env.BRANCH_NAME}"
      }
  }
}
