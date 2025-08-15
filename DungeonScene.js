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
    }

    create() {
        // 던전 지도 로드
        this.loadDungeonMap();
        
        // 카메라 설정
        this.cameras.main.setBounds(0, 0, this.dungeonMap.width * this.tileSize, this.dungeonMap.height * this.tileSize);
        this.cameras.main.setZoom(1.5);
        
        // 플레이어 생성
        this.createPlayer();
        
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
    
        // 0.5초 후 공격 상태 해제
        this.time.delayedCall(500, () => {
            this.isAttacking = false;
            this.player.anims.play('idle_' + this.lastDirection);
            // 크기 복원
            this.player.setScale(currentScaleX, currentScaleY);
        });
    }
    
    
}
