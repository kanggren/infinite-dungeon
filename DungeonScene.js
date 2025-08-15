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
                        monster.hp = 8; // 몬스터 HP 설정 (높임)
                        monster.maxHp = 8;
                        
                        // 몬스터 HP 바 생성
                        monster.hpBar = this.createMonsterHpBar(monster);
                        
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
                    monster.spriteKey = spriteKey;
                    monster.hp = 8; // 몬스터 HP 설정 (높임)
                    monster.maxHp = 8;
                    
                    // 몬스터 HP 바 생성
                    monster.hpBar = this.createMonsterHpBar(monster);
                    
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

    update() {
        // 공격 쿨다운 감소
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        // 몬스터 애니메이션 업데이트
        this.updateMonsterAnimation();
        
        // 플레이어 이동 처리
        this.handlePlayerMovement();
        
        // 공격 입력 처리
        this.handleAttackInput();
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
    
}
