# 🗡️ 무한 던전 (Infinite Dungeon)

Phaser.js를 이용한 2D 던전 탐험 게임입니다.

## 🎮 게임 특징

- **던전 탐험**: 텍스트 기반 맵 데이터를 이용한 동적 던전 생성
- **플레이어 이동**: 4방향 이동과 애니메이션
- **공격 시스템**: 스페이스바를 이용한 공격 모션
- **물리 시스템**: 벽과의 충돌 감지
- **카메라 시스템**: 플레이어를 따라가는 자동 카메라

## 🎯 조작법

- **방향키**: 플레이어 이동
- **스페이스바**: 공격

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 빌드
```bash
npm run build
```

## 🏗️ 프로젝트 구조

```
infinite-dungeon/
├── assets/
│   ├── maps/           # 던전 맵 데이터
│   └── sprites/        # 게임 스프라이트
│       ├── dungeon/    # 던전 타일
│       └── player/     # 플레이어 스프라이트
├── index.html          # 메인 HTML 파일
├── DungeonScene.js     # 게임 씬 클래스
├── package.json        # 프로젝트 설정
└── README.md           # 프로젝트 설명
```

## 🎨 기술 스택

- **Phaser.js 3.70.0**: 2D 게임 엔진
- **HTML5 Canvas**: 게임 렌더링
- **JavaScript ES6+**: 게임 로직
- **Parcel**: 번들러 및 개발 서버

## 🔧 개발 환경

- Node.js 14+
- npm 또는 yarn
- Live Server (VS Code 확장)

## 📝 라이선스

MIT License

## 🤝 기여

버그 리포트나 기능 제안은 이슈로 등록해 주세요!

---

**즐거운 던전 탐험 되세요! 🗺️✨**
