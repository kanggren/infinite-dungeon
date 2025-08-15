// 던전 씬 클래스 정의
class DungeonScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DungeonScene' });
        this.tileSize = 32;
        this.dungeonMap = null;
        this.walls = null;
        this.player = null;
        this.floorTiles = null;
        this.startPoint = null;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.lastDirection = 'down';
        this.monsters = null;
        this.monsterAnimationTimer = 0;
        this.attackRange = 50; // 공격 범위
        
        // 플레이어 체력 시스템
        this.playerHealth = 100;
        this.maxPlayerHealth = 100;
        this.healthBar = null;
        this.healthText = null;
        
        // 경험치 및 레벨 시스템
        this.playerExp = 0;
        this.playerLevel = 1;
        this.expToNextLevel = 100; // 다음 레벨까지 필요한 경험치
        this.expBar = null;
        this.expText = null;
        this.levelText = null;
        
        // 몬스터 AI 시스템
        this.monsterDetectionRange = 150; // 몬스터가 플레이어를 감지하는 범위
        this.monsterAttackRange = 40; // 몬스터 공격 범위
        this.monsterAttackCooldown = 60; // 몬스터 공격 쿨다운 (프레임)
        this.monsterMoveSpeed = 80; // 몬스터 이동 속도
        this.monsterAttackDamage = 15; // 몬스터 공격 데미지
        this.playerInvincibleTime = 0; // 플레이어 무적 시간
        this.playerInvincibleDuration = 120; // 플레이어 무적 지속 시간 (프레임)
    }

    preload() {
        // 던전 지도 텍스트 파일 로드
        this.load.text('dungeonMap', 'assets/maps/dungeon_map.txt');
        
        // 던전 타일 스프라이트 로드
        this.load.image('dungeon_tile', 'assets/sprites/dungeon/segment_0.png');
        
        // 플레이어 스프라이트 로드
        this.load.image('player_down1', 'assets/sprites/player/player_down1.png');
        this.load.image('player_down2', 'assets/sprites/player/player_down2.png');
        this.load.image('player_up1', 'assets/sprites/player/player_up1.png');
        this.load.image('player_up2', 'assets/sprites/player/player_up2.png');
        this.load.image('player_walking1', 'assets/sprites/player/player_walking1.png');
        this.load.image('player_walking2', 'assets/sprites/player/player_walking2.png');
        
        // 공격 스프라이트 로드
        this.load.image('player_dashing', 'assets/sprites/player/dashing.png');
        
        // 몬스터 스프라이트 로드
        this.load.image('bone_warrior1', 'assets/sprites/monster/bone_warrior 1.png');
        this.load.image('bone_warrior2', 'assets/sprites/monster/bone_warrior 2.png');
        
        // 뼈 잔해 스프라이트 로드
        this.load.image('bone_remains1', 'assets/sprites/monster/bone_remains 1.png');
        this.load.image('bone_remains2', 'assets/sprites/monster/bone_remains 2.png');
    }

    create() {
        // 던전 지도 로드
        this.loadDungeonMap();
        
        // 카메라 설정
        this.cameras.main.setBounds(0, 0, this.dungeonMap.width * this.tileSize, this.dungeonMap.height * this.tileSize);
        this.cameras.main.setZoom(1.5);
        
        // 플레이어 생성
        this.createPlayer();
        
        // 몬스터 생성
        this.createMonsters();
        
        // 카메라가 플레이어를 따라가도록 설정
        this.cameras.main.startFollow(this.player);
        
        // 시작점 표시
        this.createStartPoint();
        
        // 체력바 생성
        this.createHealthBar();
        
        // 경험치 및 레벨 UI 생성
        this.createExperienceUI();
        
        // 화면 크기 변경 이벤트 리스너 추가
        this.scale.on('resize', this.onResize, this);
        
        // 디버그 정보 표시
        console.log('게임 생성 완료');
        console.log('던전 크기:', this.dungeonMap.width, 'x', this.dungeonMap.height);
        console.log('플레이어 위치:', this.player.x, this.player.y);
    }

    loadDungeonMap() {
        const mapText = this.cache.text.get('dungeonMap');
        if (!mapText) {
            console.error('던전 맵을 로드할 수 없습니다!');
            return;
        }
        
        const lines = mapText.split('\n').filter(line => line.trim());
        console.log('맵 라인 수:', lines.length);
        console.log('첫 번째 라인 길이:', lines[0] ? lines[0].length : 0);
        
        this.dungeonMap = {
            width: lines[0].length,
            height: lines.length,
            data: lines
        };

        // 벽 그룹 생성
        this.walls = this.physics.add.staticGroup();
        
        // 바닥 타일 그룹 생성
        this.floorTiles = this.add.group();
        
        // 지도 렌더링
        for (let y = 0; y < this.dungeonMap.height; y++) {
            for (let x = 0; x < this.dungeonMap.width; x++) {
                const char = this.dungeonMap.data[y][x];
                const worldX = x * this.tileSize;
                const worldY = y * this.tileSize;
                
                if (char === '□') {
                    // 벽 생성
                    const wall = this.add.image(worldX + this.tileSize/2, worldY + this.tileSize/2, 'dungeon_tile');
                    wall.setDisplaySize(this.tileSize, this.tileSize);
                    wall.setTint(0x888888);
                    
                    // 벽에 물리 바디 추가
                    this.physics.add.existing(wall, true);
                    wall.body.setSize(this.tileSize * 0.9, this.tileSize * 0.9);
                    
                    this.walls.add(wall);
                } else if (char === ' ' || char === 'S') {
                    // 바닥 타일 생성
                    const floor = this.add.image(worldX + this.tileSize/2, worldY + this.tileSize/2, 'dungeon_tile');
                    floor.setDisplaySize(this.tileSize, this.tileSize);
                    floor.setTint(0x444444);
                    this.floorTiles.add(floor);
                }
            }
        }
        
        // 바닥 타일을 벽 뒤에 배치
        this.floorTiles.setDepth(0);
        this.walls.setDepth(1);
        
        console.log('던전 맵 렌더링 완료');
    }

    createMonsters() {
        // 몬스터 그룹 생성
        this.monsters = this.add.group();
        
        let monsterCount = 0;
        
        // 던전 맵을 순회하면서 빈 공간에 몬스터 배치
        for (let y = 0; y < this.dungeonMap.height; y++) {
            for (let x = 0; x < this.dungeonMap.width; x++) {
                const char = this.dungeonMap.data[y][x];
                
                // 빈 공간이고 시작점이 아닌 곳에만 몬스터 배치
                if (char === ' ' && char !== 'S') {
                    // 일정 간격으로 몬스터 배치 (매우 많이 배치)
                    if (monsterCount % 3 === 0) {
                        const worldX = x * this.tileSize + this.tileSize/2;
                        const worldY = y * this.tileSize + this.tileSize/2;
                        
                        // 번갈아가며 bone warrior 1과 2 사용
                        const spriteKey = monsterCount % 2 === 0 ? 'bone_warrior1' : 'bone_warrior2';
                        
                        const monster = this.add.image(worldX, worldY, spriteKey);
                        monster.setScale(0.8); // 몬스터 크기 조정
                        monster.setDepth(1);
                        
                        // 몬스터에 고유 ID 부여
                        monster.monsterId = monsterCount;
                        monster.spriteKey = spriteKey;
                        monster.monsterType = 'normal'; // 일반 몬스터
                        monster.hp = 8; // 몬스터 HP 설정 (높임)
                        monster.maxHp = 8;
                        
                        // 몬스터 AI 속성 추가
                        monster.attackCooldown = 0;
                        monster.isChasing = false;
                        monster.targetX = monster.x;
                        monster.targetY = monster.y;
                        monster.lastMoveTime = 0;
                        
                        // 몬스터 HP 바 생성
                        monster.hpBar = this.createMonsterHpBar(monster);
                        
                        // 몬스터 공격 범위 표시 (디버그용, 선택적으로 활성화)
                        // monster.attackRangeIndicator = this.add.circle(monster.x, monster.y, this.monsterAttackRange, 0xff0000, 0.2);
                        // monster.attackRangeIndicator.setDepth(1);
                        
                        this.monsters.add(monster);
                        monsterCount++;
                        
                        console.log(`몬스터 ${monsterCount} 생성: ${spriteKey} at (${x}, ${y})`);
                    }
                }
            }
        }
        
        // 시작점 근처에 몬스터 3마리 추가 생성
        this.createStartAreaMonsters();
        
        console.log(`총 ${monsterCount}개의 몬스터 생성 완료`);
    }

    createStartAreaMonsters() {
        // 시작점 S 찾기
        let startX = 0, startY = 0;
        for (let y = 0; y < this.dungeonMap.height; y++) {
            for (let x = 0; x < this.dungeonMap.width; x++) {
                if (this.dungeonMap.data[y][x] === 'S') {
                    startX = x;
                    startY = y;
                    break;
                }
            }
            if (startX > 0) break;
        }
        
        if (startX > 0 && startY > 0) {
            // 시작점 주변에 몬스터 2마리 배치
            const positions = [
                { x: startX - 2, y: startY - 1 },  // 시작점 왼쪽 위
                { x: startX + 1, y: startY - 1 }   // 시작점 오른쪽 위
            ];
            
            positions.forEach((pos, index) => {
                // 맵 범위 내에 있고 빈 공간인지 확인
                if (pos.x >= 0 && pos.x < this.dungeonMap.width && 
                    pos.y >= 0 && pos.y < this.dungeonMap.height &&
                    this.dungeonMap.data[pos.y][pos.x] === ' ') {
                    
                    const worldX = pos.x * this.tileSize + this.tileSize/2;
                    const worldY = pos.y * this.tileSize + this.tileSize/2;
                    
                    // 번갈아가며 bone warrior 1과 2 사용
                    const spriteKey = index % 2 === 0 ? 'bone_warrior1' : 'bone_warrior2';
                    
                    const monster = this.add.image(worldX, worldY, spriteKey);
                    monster.setScale(0.8);
                    monster.setDepth(1);
                    
                    // 몬스터에 고유 ID 부여
                    monster.monsterId = `start_${index}`;
                    monster.monsterType = 'normal'; // 일반 몬스터
                    monster.spriteKey = spriteKey;
                    monster.hp = 8; // 몬스터 HP 설정 (높임)
                    monster.maxHp = 8;
                    
                    // 몬스터 AI 속성 추가
                    monster.attackCooldown = 0;
                    monster.isChasing = false;
                    monster.targetX = monster.x;
                    monster.targetY = monster.y;
                    monster.lastMoveTime = 0;
                    
                    // 몬스터 HP 바 생성
                    monster.hpBar = this.createMonsterHpBar(monster);
                    
                    // 몬스터 공격 범위 표시 (디버그용, 선택적으로 활성화)
                    // monster.attackRangeIndicator = this.add.circle(monster.x, monster.y, this.monsterAttackRange, 0xff0000, 0.2);
                    // monster.attackRangeIndicator.setDepth(1);
                    
                    this.monsters.add(monster);
                    
                    console.log(`시작점 근처 몬스터 ${index + 1} 생성: ${spriteKey} at (${pos.x}, ${pos.y})`);
                }
            });
        }
    }

    updateMonsterAnimation() {
        // 몬스터 애니메이션 타이머 증가
        this.monsterAnimationTimer++;
        
        // 60프레임마다 몬스터 스프라이트 변경 (1초마다)
        if (this.monsterAnimationTimer >= 60) {
            // 안전한 배열 복사본 생성 (죽은 몬스터와 뼈 잔해는 제외)
            const activeMonsters = this.monsters.getChildren().filter(monster => 
                monster && monster.active && !monster.isDead && monster.hp > 0 && !monster.isRemains
            );
            
            activeMonsters.forEach(monster => {
                try {
                    // 현재 스프라이트와 반대 스프라이트로 변경
                    if (monster.spriteKey === 'bone_warrior1') {
                        monster.setTexture('bone_warrior2');
                        monster.spriteKey = 'bone_warrior2';
                    } else {
                        monster.setTexture('bone_warrior1');
                        monster.spriteKey = 'bone_warrior1';
                    }
                    
                    // HP 바 위치 업데이트 (안전하게)
                    if (monster.hpBarBg && monster.hpBarBg.active) {
                        monster.hpBarBg.setPosition(monster.x, monster.y - 25);
                    }
                    if (monster.hpBarFill && monster.hpBarFill.active) {
                        monster.hpBarFill.setPosition(monster.x, monster.y - 25);
                    }
                } catch (error) {
                    console.log('몬스터 애니메이션 업데이트 오류:', error);
                }
            });
            
            // 타이머 리셋
            this.monsterAnimationTimer = 0;
        }
    }

    updateMonsterAI() {
        if (!this.player || !this.monsters) return;
        
        const activeMonsters = this.monsters.getChildren().filter(monster => 
            monster && monster.active && !monster.isDead && monster.hp > 0 && !monster.isRemains
        );
        
        activeMonsters.forEach(monster => {
            try {
                // 플레이어와의 거리 계산
                const distanceToPlayer = Phaser.Math.Distance.Between(
                    monster.x, monster.y, 
                    this.player.x, this.player.y
                );
                
                // 공격 쿨다운 감소
                if (monster.attackCooldown > 0) {
                    monster.attackCooldown--;
                }
                
                // 플레이어가 감지 범위 내에 있는지 확인
                if (distanceToPlayer <= this.monsterDetectionRange) {
                    monster.isChasing = true;
                    
                    // 추적 상태일 때 몬스터를 빨간색으로 표시
                    monster.setTint(0xff6666);
                    
                    // 공격 범위 내에 있으면 공격
                    if (distanceToPlayer <= this.monsterAttackRange && monster.attackCooldown === 0) {
                        this.monsterAttackPlayer(monster);
                    } else if (distanceToPlayer > this.monsterAttackRange) {
                        // 플레이어를 향해 이동
                        this.moveMonsterTowardsPlayer(monster);
                    }
                } else {
                    monster.isChasing = false;
                    // 원래 색상으로 복원
                    monster.clearTint();
                    // 원래 위치로 돌아가기
                    this.returnMonsterToOriginalPosition(monster);
                }
                
                // HP 바 위치 업데이트
                if (monster.hpBarBg && monster.hpBarBg.active) {
                    monster.hpBarBg.setPosition(monster.x, monster.y - 25);
                }
                if (monster.hpBarFill && monster.hpBarFill.active) {
                    monster.hpBarFill.setPosition(monster.x, monster.y - 25);
                }
                
                // 공격 범위 표시 업데이트 (디버그용)
                if (monster.attackRangeIndicator && monster.attackRangeIndicator.active) {
                    monster.attackRangeIndicator.setPosition(monster.x, monster.y);
                }
                
            } catch (error) {
                console.log('몬스터 AI 업데이트 중 오류:', error);
            }
        });
    }

    moveMonsterTowardsPlayer(monster) {
        if (!this.player) return;
        
        // 플레이어 방향으로의 각도 계산
        const angle = Phaser.Math.Angle.Between(monster.x, monster.y, this.player.x, this.player.y);
        
        // 각도를 기반으로 속도 계산
        const velocityX = Math.cos(angle) * this.monsterMoveSpeed;
        const velocityY = Math.sin(angle) * this.monsterMoveSpeed;
        
        // 몬스터 위치 업데이트
        monster.x += velocityX * 0.016; // 60fps 기준으로 조정
        monster.y += velocityY * 0.016;
        
        // 벽과의 충돌 검사 (간단한 구현)
        this.checkMonsterWallCollision(monster);
    }

    returnMonsterToOriginalPosition(monster) {
        // 원래 위치로 돌아가기
        const distanceToOriginal = Phaser.Math.Distance.Between(
            monster.x, monster.y, 
            monster.targetX, monster.targetY
        );
        
        if (distanceToOriginal > 5) { // 5픽셀 이내면 제자리에 있음
            const angle = Phaser.Math.Angle.Between(monster.x, monster.y, monster.targetX, monster.targetY);
            const velocityX = Math.cos(angle) * (this.monsterMoveSpeed * 0.5); // 천천히 돌아감
            const velocityY = Math.sin(angle) * (this.monsterMoveSpeed * 0.5);
            
            monster.x += velocityX * 0.016;
            monster.y += velocityY * 0.016;
            
            // 벽과의 충돌 검사
            this.checkMonsterWallCollision(monster);
        }
    }

    checkMonsterWallCollision(monster) {
        // 간단한 벽 충돌 검사
        const monsterBounds = {
            left: monster.x - 16,
            right: monster.x + 16,
            top: monster.y - 16,
            bottom: monster.y + 16
        };
        
        // 맵 경계 검사
        if (monsterBounds.left < 0) monster.x = 16;
        if (monsterBounds.right > this.dungeonMap.width * this.tileSize) monster.x = this.dungeonMap.width * this.tileSize - 16;
        if (monsterBounds.top < 0) monster.y = 16;
        if (monsterBounds.bottom > this.dungeonMap.height * this.tileSize) monster.y = this.dungeonMap.height * this.tileSize - 16;
    }

    monsterAttackPlayer(monster) {
        if (!this.player || this.playerInvincibleTime > 0) return;
        
        // 공격 쿨다운 설정
        monster.attackCooldown = this.monsterAttackCooldown;
        
        // 플레이어에게 데미지
        this.playerHealth -= this.monsterAttackDamage;
        this.playerHealth = Math.max(0, this.playerHealth);
        
        // 플레이어 무적 시간 설정
        this.playerInvincibleTime = this.playerInvincibleDuration;
        
        // 데미지 표시
        this.showPlayerDamageNumber(this.player.x, this.player.y, this.monsterAttackDamage);
        
        // 플레이어 피격 효과
        this.playerHitEffect();
        
        console.log(`플레이어가 몬스터 ${monster.monsterId}에게 공격받음! 데미지: ${this.monsterAttackDamage}, HP: ${this.playerHealth}`);
        
        // 체력바 업데이트
        this.updateHealthBar();
        
        // 플레이어가 죽었는지 확인
        if (this.playerHealth <= 0) {
            this.playerDeath();
        }
    }

    showPlayerDamageNumber(x, y, damage) {
        try {
            // 데미지 텍스트 생성
            const damageText = this.add.text(x, y - 40, damage.toString(), {
                fontSize: '20px',
                fill: '#ff0000',
                stroke: '#ffffff',
                strokeThickness: 2,
                fontStyle: 'bold'
            });
            damageText.setOrigin(0.5);
            damageText.setDepth(4);
            
            // 데미지 텍스트 애니메이션 (위로 올라가면서 페이드아웃)
            this.tweens.add({
                targets: damageText,
                y: y - 80,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    try {
                        if (damageText && damageText.active) {
                            damageText.destroy();
                        }
                    } catch (error) {
                        console.log('플레이어 데미지 텍스트 제거 중 오류:', error);
                    }
                }
            });
        } catch (error) {
            console.log('플레이어 데미지 숫자 표시 중 오류:', error);
        }
    }

    playerHitEffect() {
        if (!this.player) return;
        
        // 플레이어 피격 시 빨간색 깜빡임 효과
        const originalTint = this.player.tint;
        this.player.setTint(0xff0000);
        
        // 0.2초 후 원래 색상으로 복원
        this.time.delayedCall(200, () => {
            if (this.player && this.player.active) {
                this.player.clearTint();
            }
        });
        
        // 화면 흔들림 효과
        this.cameras.main.shake(200, 0.01);
    }

    playerDeath() {
        if (!this.player) return;
        
        console.log('플레이어가 사망했습니다!');
        
        // 플레이어 사망 효과
        this.player.setTint(0x666666);
        
        // 게임 오버 텍스트 표시
        const gameOverText = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY, 
            'GAME OVER', {
                fontSize: '48px',
                fill: '#ff0000',
                stroke: '#ffffff',
                strokeThickness: 4,
                fontStyle: 'bold'
            }
        );
        gameOverText.setOrigin(0.5);
        gameOverText.setDepth(100);
        
        // 재시작 안내 텍스트
        const restartText = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY + 60, 
            'R 키를 눌러 재시작', {
                fontSize: '24px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        restartText.setOrigin(0.5);
        restartText.setDepth(100);
        
        // R 키로 재시작 기능 추가
        this.input.keyboard.once('keydown-R', () => {
            this.scene.restart();
        });
    }

    createStartPoint() {
        // 시작점 S 찾기
        for (let y = 0; y < this.dungeonMap.height; y++) {
            for (let x = 0; x < this.dungeonMap.width; x++) {
                if (this.dungeonMap.data[y][x] === 'S') {
                    const worldX = x * this.tileSize + this.tileSize/2;
                    const worldY = y * this.tileSize + this.tileSize/2;
                    
                    // 시작점 표시 (녹색 원)
                    this.startPoint = this.add.circle(worldX, worldY, this.tileSize/4, 0x00ff00);
                    this.startPoint.setDepth(1);
                    
                    // 시작점 텍스트
                    const startText = this.add.text(worldX, worldY - this.tileSize/2, 'START', {
                        fontSize: '12px',
                        fill: '#00ff00'
                    });
                    startText.setOrigin(0.5);
                    startText.setDepth(1);
                    
                    console.log('시작점 찾음:', x, y, '->', worldX, worldY);
                    break;
                }
            }
            if (this.startPoint) break;
        }
    }

    createPlayer() {
        // 시작점 S 찾기
        let startX = 0, startY = 0;
        for (let y = 0; y < this.dungeonMap.height; y++) {
            for (let x = 0; x < this.dungeonMap.width; x++) {
                if (this.dungeonMap.data[y][x] === 'S') {
                    startX = x * this.tileSize + this.tileSize/2;
                    startY = y * this.tileSize + this.tileSize/2;
                    break;
                }
            }
            if (startX > 0) break;
        }
        
        if (startX === 0 && startY === 0) {
            // 시작점을 찾을 수 없는 경우 중앙에 배치
            startX = (this.dungeonMap.width / 2) * this.tileSize;
            startY = (this.dungeonMap.height / 2) * this.tileSize;
            console.log('시작점을 찾을 수 없어 중앙에 배치:', startX, startY);
        }
        
        // 플레이어 생성
        this.player = this.physics.add.sprite(startX, startY, 'player_down1');
        this.player.setCollideWorldBounds(false);
        this.player.setDepth(2);
        
        // 플레이어 물리 바디 크기 조정
        this.player.body.setSize(this.tileSize * 0.4, this.tileSize * 0.4);
        
        // 플레이어와 벽 충돌 설정
        this.physics.add.collider(this.player, this.walls);
        
        // 플레이어 크기 조정
        this.player.setScale(0.6);

        // 애니메이션 정의
        this.anims.create({
            key: 'walk_down',
            frames: [
                { key: 'player_down1' },
                { key: 'player_down2' }
            ],
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'walk_up',
            frames: [
                { key: 'player_up1' },
                { key: 'player_up2' }
            ],
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'walk_left',
            frames: [
                { key: 'player_walking1' },
                { key: 'player_walking2' }
            ],
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'walk_right',
            frames: [
                { key: 'player_walking1' },
                { key: 'player_walking2' }
            ],
            frameRate: 8,
            repeat: -1
        });
        
        // 정지 애니메이션
        this.anims.create({
            key: 'idle_down',
            frames: [{ key: 'player_down1' }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'idle_up',
            frames: [{ key: 'player_up1' }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'idle_left',
            frames: [{ key: 'player_walking1' }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'idle_right',
            frames: [{ key: 'player_walking1' }],
            frameRate: 1
        });
        
        // 공격 애니메이션 정의 (크기 조정 포함)
        this.anims.create({
            key: 'attack_down',
            frames: [{ 
                key: 'player_dashing',
                frame: 0
            }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'attack_up',
            frames: [{ 
                key: 'player_dashing',
                frame: 0
            }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'attack_left',
            frames: [{ 
                key: 'player_dashing',
                frame: 0
            }],
            frameRate: 1
        });
        
        this.anims.create({
            key: 'attack_right',
            frames: [{ 
                key: 'player_dashing',
                frame: 0
            }],
            frameRate: 1
        });
        
        console.log('플레이어 생성 완료:', startX, startY);
    }
    
    createHealthBar() {
        // 체력바 배경 (빨간색)
        this.healthBar = this.add.graphics();
        this.healthBar.setDepth(10); // UI를 최상단에 표시
        
        // 체력바 텍스트
        this.healthText = this.add.text(0, 0, `HP: ${this.playerHealth}/${this.maxPlayerHealth}`, {
            fontSize: '14px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.healthText.setDepth(10);
        this.healthText.setOrigin(0.5, 0.5);
        
        // 체력바 업데이트
        this.updateHealthBar();
    }
    
    updateHealthBar() {
        if (!this.healthBar || !this.healthText || !this.player) return;
        
        // 플레이어 위치 기준으로 체력바 위치 설정
        const playerX = this.player.x;
        const playerY = this.player.y - 40; // 플레이어 위 40픽셀
        
        // 체력바 그리기
        this.healthBar.clear();
        
        // 배경 (빨간색)
        this.healthBar.fillStyle(0xff0000);
        this.healthBar.fillRect(playerX - 25, playerY - 10, 50, 8);
        
        // 현재 체력 (녹색)
        const healthPercentage = this.playerHealth / this.maxPlayerHealth;
        this.healthBar.fillStyle(0x00ff00);
        this.healthBar.fillRect(playerX - 25, playerY - 10, 50 * healthPercentage, 8);
        
        // 테두리
        this.healthBar.lineStyle(1, 0xffffff);
        this.healthBar.strokeRect(playerX - 25, playerY - 10, 50, 8);
        
        // 무적 상태일 때 체력바에 무적 효과 추가
        if (this.playerInvincibleTime > 0) {
            // 무적 상태일 때 체력바를 노란색으로 표시
            this.healthBar.fillStyle(0xffff00, 0.5);
            this.healthBar.fillRect(playerX - 25, playerY - 10, 50, 8);
            
            // 무적 상태 텍스트 표시
            this.healthText.setText(`HP: ${this.playerHealth}/${this.maxPlayerHealth} (무적!)`);
        } else {
            this.healthText.setText(`HP: ${this.playerHealth}/${this.maxPlayerHealth}`);
        }
        
        // 텍스트 위치 업데이트
        this.healthText.setPosition(playerX, playerY - 25);
    }
    
    createExperienceUI() {
        // 화면 오른쪽 상단에 경험치 UI 위치
        const rightMargin = 20;
        const topMargin = 20;
        const uiWidth = 200;
        const uiHeight = 60;
        
        // UI 배경 (반투명 검은색)
        this.expUIBackground = this.add.rectangle(
            this.cameras.main.width - rightMargin - uiWidth/2, 
            topMargin + uiHeight/2, 
            uiWidth + 20, 
            uiHeight + 20, 
            0x000000, 
            0.7
        );
        this.expUIBackground.setDepth(10);
        this.expUIBackground.setOrigin(0.5);
        
        // 경험치바 배경 (회색)
        this.expBar = this.add.rectangle(
            this.cameras.main.width - rightMargin - uiWidth/2, 
            topMargin + 35, 
            uiWidth, 
            8, 
            0x666666
        );
        this.expBar.setDepth(10);
        this.expBar.setOrigin(0.5);
        
        // 경험치바 (파란색)
        this.expBarFill = this.add.rectangle(
            this.cameras.main.width - rightMargin - uiWidth/2, 
            topMargin + 35, 
            0, 
            8, 
            0x0088ff
        );
        this.expBarFill.setDepth(10);
        this.expBarFill.setOrigin(0, 0.5);
        
        // 경험치 텍스트
        this.expText = this.add.text(
            this.cameras.main.width - rightMargin - uiWidth/2, 
            topMargin + 50, 
            'EXP: 0/100', {
                fontSize: '14px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.expText.setDepth(10);
        this.expText.setOrigin(0.5);
        
        // 좌측 상단에 레벨 표시 추가
        const leftMargin = 20;
        const levelUiWidth = 120;
        const levelUiHeight = 40;
        
        // 레벨 UI 배경 (반투명 검은색)
        this.levelUIBackground = this.add.rectangle(
            leftMargin + levelUiWidth/2, 
            topMargin + levelUiHeight/2, 
            levelUiWidth + 20, 
            levelUiHeight + 20, 
            0x000000, 
            0.7
        );
        this.levelUIBackground.setDepth(10);
        this.levelUIBackground.setOrigin(0.5);
        
        // 레벨 텍스트 (좌측 상단)
        this.levelText = this.add.text(
            leftMargin + levelUiWidth/2, 
            topMargin + levelUiHeight/2, 
            'LV.1', {
                fontSize: '20px',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2,
                fontStyle: 'bold'
            }
        );
        this.levelText.setDepth(10);
        this.levelText.setOrigin(0.5);
        
        // 초기 경험치 UI 업데이트
        this.updateExperienceUI();
    }
    
        updateExperienceUI() {
        if (this.expBarFill && this.expText && this.levelText) {
            // 경험치바 업데이트
            const expRatio = this.playerExp / this.expToNextLevel;
            const newWidth = 200 * expRatio;
            this.expBarFill.setSize(newWidth, 8);
            
            // 경험치바 위치 재설정 (오른쪽 상단 기준)
            const rightMargin = 20;
            const topMargin = 20;
            const uiWidth = 200;
            
            // 경험치바 배경과 채움바 위치 동기화
            if (this.expBar) {
                this.expBar.setPosition(
                    this.cameras.main.width - rightMargin - uiWidth/2, 
                    topMargin + 35
                );
            }
            
            // 경험치바 채움바 위치 설정
            this.expBarFill.setPosition(
                this.cameras.main.width - rightMargin - uiWidth, 
                topMargin + 35
            );
            
            // 경험치 텍스트 업데이트
            this.expText.setText(`EXP: ${this.playerExp}/${this.expToNextLevel}`);
            
            // 레벨 텍스트 업데이트 (좌측 상단)
            this.levelText.setText(`LV.${this.playerLevel}`);
            
            // HTML의 레벨 표시도 업데이트
            this.updateHTMLLevelDisplay();
        }
    }
    
    updateHTMLLevelDisplay() {
        // HTML의 레벨 표시 업데이트
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) {
            levelDisplay.textContent = `LV.${this.playerLevel}`;
        }
        
        // HTML의 경험치바 업데이트
        const expBarFill = document.getElementById('exp-bar-fill');
        const expText = document.getElementById('exp-text');
        
        if (expBarFill && expText) {
            // 경험치바 채움 비율 계산
            const expRatio = this.playerExp / this.expToNextLevel;
            const fillWidth = Math.min(100, expRatio * 100);
            
            // 경험치바 채움 너비 설정
            expBarFill.style.width = `${fillWidth}%`;
            
            // 경험치 텍스트 업데이트
            expText.textContent = `EXP: ${this.playerExp}/${this.expToNextLevel}`;
        }
    }

    update() {
        // 공격 쿨다운 감소
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        // 플레이어 무적 시간 감소
        if (this.playerInvincibleTime > 0) {
            this.playerInvincibleTime--;
        }
        
        // 몬스터 애니메이션 업데이트
        this.updateMonsterAnimation();
        
        // 몬스터 AI 업데이트
        this.updateMonsterAI();
        
        // 플레이어 이동 처리
        this.handlePlayerMovement();
        
        // 공격 입력 처리
        this.handleAttackInput();
        
        // 체력바 위치 업데이트 (플레이어를 따라다니도록)
        this.updateHealthBar();
    }

    handlePlayerMovement() {
        const cursors = this.input.keyboard.createCursorKeys();
        const speed = 150;
        
        // 이동 방향 설정
        let velocityX = 0;
        let velocityY = 0;
        
        if (cursors.left.isDown) {
            velocityX = -speed;
        } else if (cursors.right.isDown) {
            velocityX = speed;
        }
        
        if (cursors.up.isDown) {
            velocityY = -speed;
        } else if (cursors.down.isDown) {
            velocityY = speed;
        }
        
        // 대각선 이동 시 속도 정규화
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }
        
        // 플레이어 속도 설정
        this.player.setVelocity(velocityX, velocityY);
        
        // 애니메이션 처리
        if (velocityX !== 0 || velocityY !== 0) {
            // 이동 중일 때 애니메이션
            if (velocityY < 0) { // 위로 이동
                this.player.setFlipX(false);
                this.player.anims.play('walk_up', true);
                this.lastDirection = 'up';
            } else if (velocityY > 0) { // 아래로 이동
                this.player.setFlipX(false);
                this.player.anims.play('walk_down', true);
                this.lastDirection = 'down';
            } else if (velocityX < 0) { // 왼쪽으로 이동
                this.player.setFlipX(true);
                this.player.anims.play('walk_left', true);
                this.lastDirection = 'left';
            } else if (velocityX > 0) { // 오른쪽으로 이동
                this.player.setFlipX(false);
                this.player.anims.play('walk_right', true);
                this.lastDirection = 'right';
            }
        } else {
            // 정지 시 현재 방향에 맞는 정지 애니메이션
            const currentAnim = this.player.anims.currentAnim;
            if (currentAnim) {
                if (currentAnim.key === 'walk_up') {
                    this.player.anims.play('idle_up');
                } else if (currentAnim.key === 'walk_down') {
                    this.player.anims.play('idle_down');
                } else if (currentAnim.key === 'walk_left') {
                    this.player.anims.play('idle_left');
                } else if (currentAnim.key === 'walk_right') {
                    this.player.anims.play('idle_right');
                }
            }
        }
    }
    
    handleAttackInput() {
        // 스페이스바로 공격
        if (this.input.keyboard.addKey('SPACE').isDown && !this.isAttacking && this.attackCooldown === 0) {
            this.performAttack();
        }
    }
    
    performAttack() {
        this.isAttacking = true;
        this.attackCooldown = 30;
    
        let attackAnim = 'attack_down';
        switch (this.lastDirection) {
            case 'up':    attackAnim = 'attack_up'; break;
            case 'down':  attackAnim = 'attack_down'; break;
            case 'left':  attackAnim = 'attack_left'; this.player.setFlipX(true); break;
            case 'right': attackAnim = 'attack_right'; this.player.setFlipX(false); break;
        }
    
        // 공격 애니메이션 재생
        this.player.anims.play(attackAnim);
    
        // 현재 캐릭터 크기 저장
        const currentScaleX = this.player.scaleX;
        const currentScaleY = this.player.scaleY;
    
        // 공격 스프라이트 크기를 기존 크기와 동일하게 적용
        this.player.setScale(currentScaleX, currentScaleY);
        
        // 공격 범위 내의 몬스터에게 데미지
        this.checkMonsterHit();
    
        // 0.5초 후 공격 상태 해제
        this.time.delayedCall(500, () => {
            this.isAttacking = false;
            this.player.anims.play('idle_' + this.lastDirection);
            // 크기 복원
            this.player.setScale(currentScaleX, currentScaleY);
        });
    }
    
    checkMonsterHit() {
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // 안전한 배열 복사본 생성 (죽은 몬스터는 제외)
        const activeMonsters = this.monsters.getChildren().filter(monster => 
            monster && monster.active && monster.hp > 0 && !monster.isDead
        );
        
        activeMonsters.forEach(monster => {
            try {
                // 몬스터가 여전히 유효한지 한번 더 확인
                if (!monster || !monster.active || monster.isDead || monster.hp <= 0) {
                    return;
                }
                
                const distance = Phaser.Math.Distance.Between(playerX, playerY, monster.x, monster.y);
                
                if (distance <= this.attackRange) {
                    // 랜덤 데미지 (1~3)
                    const damage = Phaser.Math.Between(1, 3);
                    monster.hp -= damage;
                    console.log(`몬스터 ${monster.monsterId} 피격! 데미지: ${damage}, HP: ${monster.hp}/${monster.maxHp}`);
                    
                    // 데미지 숫자 표시
                    this.showDamageNumber(monster.x, monster.y, damage);
                    
                    // HP 바 업데이트
                    this.updateMonsterHpBar(monster);
                    
                    // HP가 0 이하면 몬스터 제거
                    if (monster.hp <= 0) {
                        console.log(`몬스터 ${monster.monsterId} 처치!`);
                        
                        // 몬스터를 즉시 제거하지 않고 HP 바만 사라지게 함
                        monster.isDead = true;
                        
                        // 몬스터가 죽었을 때 경험치 획득
                        this.gainExperience(monster);
                        
                        // 몬스터가 죽었을 때 시각적 효과 추가
                        this.monsterDeathEffect(monster);
                        
                        // HP 바를 즉시 제거
                        if (monster.hpBarBg) {
                            monster.hpBarBg.destroy();
                            monster.hpBarBg = null;
                        }
                        
                        if (monster.hpBarFill) {
                            monster.hpBarFill.destroy();
                            monster.hpBarFill = null;
                        }
                        
                        if (monster.hpBar) {
                            monster.hpBar.destroy();
                            monster.hpBar = null;
                        }
                        
                        // 0.5초 후 몬스터 제거 (시각적 효과를 볼 수 있도록)
                        this.time.delayedCall(500, () => {
                            try {
                                if (monster && monster.active && monster.isDead) {
                                    // 몬스터를 그룹에서 제거
                                    this.monsters.remove(monster);
                                    
                                    // 몬스터 객체 제거
                                    monster.destroy();
                                    
                                    console.log(`몬스터 ${monster.monsterId} 완전히 제거됨`);
                                }
                            } catch (error) {
                                console.log('몬스터 제거 중 오류:', error);
                            }
                        });
                    }
                }
            } catch (error) {
                console.log('몬스터 공격 처리 중 오류:', error);
            }
        });
    }
    
    createMonsterHpBar(monster) {
        // HP 바 배경 (빨간색)
        const hpBarBg = this.add.rectangle(monster.x, monster.y - 25, 32, 4, 0xff0000);
        hpBarBg.setDepth(3);
        hpBarBg.setOrigin(0.5, 0.5);
        
        // HP 바 (녹색)
        const hpBar = this.add.rectangle(monster.x, monster.y - 25, 32, 4, 0x00ff00);
        hpBar.setDepth(3);
        hpBar.setOrigin(0.5, 0.5);
        
        // HP 바를 몬스터에 연결
        monster.hpBarBg = hpBarBg;
        monster.hpBarFill = hpBar;
        
        return { bg: hpBarBg, fill: hpBar };
    }
    
    updateMonsterHpBar(monster) {
        try {
            if (monster && monster.hpBarFill && monster.hpBarFill.active && 
                monster.hpBarBg && monster.hpBarBg.active) {
                
                const hpRatio = Math.max(0, monster.hp / monster.maxHp);
                const newWidth = 32 * hpRatio;
                
                // HP 바 위치와 크기 업데이트
                monster.hpBarFill.setSize(newWidth, 4);
                monster.hpBarFill.setPosition(monster.x, monster.y - 25);
                
                // HP 바 색상 변경 (HP가 낮을수록 노란색->빨간색)
                if (hpRatio > 0.6) {
                    monster.hpBarFill.setFillStyle(0x00ff00); // 녹색
                } else if (hpRatio > 0.3) {
                    monster.hpBarFill.setFillStyle(0xffff00); // 노란색
                } else {
                    monster.hpBarFill.setFillStyle(0xff0000); // 빨간색
                }
            }
        } catch (error) {
            console.log('HP 바 업데이트 중 오류:', error);
        }
    }
    
    gainExperience(monster) {
        // 몬스터 타입에 따른 경험치 획득
        let expGain = 10; // 기본 경험치
        
        // 몬스터 타입별 경험치 차등 지급 (향후 확장 가능)
        if (monster.monsterType === 'boss') {
            expGain = 50;
        } else if (monster.monsterType === 'elite') {
            expGain = 25;
        }
        
        // 경험치 획득
        this.playerExp += expGain;
        
        // 경험치 획득 표시
        this.showExperienceGain(monster.x, monster.y, expGain);
        
        // 레벨업 체크
        this.checkLevelUp();
        
        // 경험치 UI 업데이트
        this.updateExperienceUI();
        
        console.log(`경험치 ${expGain} 획득! 총 경험치: ${this.playerExp}/${this.expToNextLevel}`);
    }
    
    checkLevelUp() {
        if (this.playerExp >= this.expToNextLevel) {
            // 레벨업!
            this.playerLevel++;
            this.playerExp -= this.expToNextLevel;
            
            // 다음 레벨까지 필요한 경험치 증가 (레벨이 올라갈수록 더 많은 경험치 필요)
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
            
            // 레벨업 효과
            this.levelUpEffect();
            
            // 스탯 증가 (HP, 공격력 등)
            this.increasePlayerStats();
            
            console.log(`레벨업! 현재 레벨: ${this.playerLevel}, 다음 레벨까지: ${this.expToNextLevel}`);
        }
    }
    
    increasePlayerStats() {
        // HP 증가
        this.maxPlayerHealth += 20;
        this.playerHealth = this.maxPlayerHealth;
        
        // 공격력 증가 (향후 구현 예정)
        // this.playerAttack += 2;
        
        // 체력바 업데이트
        this.updateHealthBar();
    }
    
    levelUpEffect() {
        // 레벨업 텍스트 표시
        const levelUpText = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY - 100, 
            `LEVEL UP! ${this.playerLevel}`, {
                fontSize: '36px',
                fill: '#00ff00',
                stroke: '#ffffff',
                strokeThickness: 3,
                fontStyle: 'bold'
            }
        );
        levelUpText.setOrigin(0.5);
        levelUpText.setDepth(100);
        
        // 레벨업 텍스트 애니메이션
        this.tweens.add({
            targets: levelUpText,
            y: levelUpText.y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                if (levelUpText && levelUpText.active) {
                    levelUpText.destroy();
                }
            }
        });
        
        // 화면 효과
        this.cameras.main.flash(500, 0x00ff00, 0.3);
    }
    
    showExperienceGain(x, y, exp) {
        try {
            // 경험치 획득 텍스트 생성
            const expText = this.add.text(x, y - 60, `+${exp} EXP`, {
                fontSize: '16px',
                fill: '#00ff00',
                stroke: '#ffffff',
                strokeThickness: 2,
                fontStyle: 'bold'
            });
            expText.setOrigin(0.5);
            expText.setDepth(4);
            
            // 경험치 텍스트 애니메이션 (위로 올라가면서 페이드아웃)
            this.tweens.add({
                targets: expText,
                y: y - 100,
                alpha: 0,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    try {
                        if (expText && expText.active) {
                            expText.destroy();
                        }
                    } catch (error) {
                        console.log('경험치 텍스트 제거 중 오류:', error);
                    }
                }
            });
        } catch (error) {
            console.log('경험치 획득 표시 중 오류:', error);
        }
    }
    
    showDamageNumber(x, y, damage) {
        try {
            // 데미지 텍스트 생성
            const damageText = this.add.text(x, y - 40, damage.toString(), {
                fontSize: '20px',
                fill: '#ff0000',
                stroke: '#ffffff',
                strokeThickness: 2,
                fontStyle: 'bold'
            });
            damageText.setOrigin(0.5);
            damageText.setDepth(4);
            
            // 데미지 텍스트 애니메이션 (위로 올라가면서 페이드아웃)
            this.tweens.add({
                targets: damageText,
                y: y - 80,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => {
                    try {
                        if (damageText && damageText.active) {
                            damageText.destroy();
                        }
                    } catch (error) {
                        console.log('데미지 텍스트 제거 중 오류:', error);
                    }
                }
            });
        } catch (error) {
            console.log('데미지 숫자 표시 중 오류:', error);
        }
    }
    
    monsterDeathEffect(monster) {
        // 몬스터가 죽었을 때 뼈 잔해 이미지로 변경
        this.changeMonsterToRemains(monster);
        
        // 몬스터가 죽었을 때 시각적 효과 추가
        const deathEffect = this.add.rectangle(monster.x, monster.y, this.tileSize, this.tileSize, 0xff0000, 0.5);
        deathEffect.setDepth(2); // 플레이어보다 앞에 표시
        this.tweens.add({
            targets: deathEffect,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                deathEffect.destroy();
            }
        });
    }
    
    changeMonsterToRemains(monster) {
        try {
            // bone_remains1과 bone_remains2 중 랜덤으로 선택
            const remainsKey = Phaser.Math.Between(0, 1) === 0 ? 'bone_remains1' : 'bone_remains2';
            
            // 몬스터 이미지를 뼈 잔해로 변경
            monster.setTexture(remainsKey);
            monster.spriteKey = remainsKey;
            
            // 뼈 잔해는 애니메이션하지 않도록 설정
            monster.isRemains = true;
            
            console.log(`몬스터 ${monster.monsterId}가 ${remainsKey}로 변경됨`);
        } catch (error) {
            console.log('몬스터를 뼈 잔해로 변경하는 중 오류:', error);
        }
    }
    
    onResize() {
        // 화면 크기 변경 시 UI 위치 업데이트
        if (this.expUIBackground && this.expBar && this.expBarFill && this.expText && this.levelText) {
            const rightMargin = 20;
            const topMargin = 20;
            const uiWidth = 200;
            const uiHeight = 60;
            
            // UI 배경 위치 업데이트
            this.expUIBackground.setPosition(
                this.cameras.main.width - rightMargin - uiWidth/2, 
                topMargin + uiHeight/2
            );
            
            // 경험치바 배경 위치 업데이트
            this.expBar.setPosition(
                this.cameras.main.width - rightMargin - uiWidth/2, 
                topMargin + 35
            );
            
            // 경험치바 채움바 위치 업데이트
            this.expBarFill.setPosition(
                this.cameras.main.width - rightMargin - uiWidth, 
                topMargin + 35
            );
            
            // 경험치 텍스트 위치 업데이트
            this.expText.setPosition(
                this.cameras.main.width - rightMargin - uiWidth/2, 
                topMargin + 50
            );
        }
        
        // 좌측 상단 레벨 UI 위치 업데이트
        if (this.levelUIBackground && this.levelText) {
            const leftMargin = 20;
            const topMargin = 20;
            const levelUiWidth = 120;
            const levelUiHeight = 40;
            
            // 레벨 UI 배경 위치 업데이트
            this.levelUIBackground.setPosition(
                leftMargin + levelUiWidth/2, 
                topMargin + levelUiHeight/2
            );
            
            // 레벨 텍스트 위치 업데이트
            this.levelText.setPosition(
                leftMargin + levelUiWidth/2, 
                topMargin + levelUiHeight/2
            );
        }
    }
    
}
