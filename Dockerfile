# Multi-stage build for React
FROM node:20-alpine as build

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 yarn.lock 복사
COPY package*.json yarn.lock* ./

# yarn 설치 및 의존성 설치
RUN npm install -g yarn
RUN yarn install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 빌드 인수로 환경 변수 받기
ARG REACT_APP_SPRING_API_BASE
ARG REACT_APP_KAKAO_MAP_KEY

# 환경 변수로 설정
ENV REACT_APP_SPRING_API_BASE=$REACT_APP_SPRING_API_BASE
ENV REACT_APP_KAKAO_MAP_KEY=$REACT_APP_KAKAO_MAP_KEY

# 프로덕션 빌드 (메모리 증가)
RUN NODE_OPTIONS="--max-old-space-size=4096" yarn build

# Nginx 서버 단계
FROM nginx:alpine

# React 빌드 결과물 복사
COPY --from=build /app/build /usr/share/nginx/html

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 포트 노출
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]