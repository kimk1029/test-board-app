import * as Phaser from 'phaser'

export class HoldemLoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics
  private progressBox!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text
  private percentText!: Phaser.GameObjects.Text
  private assetText!: Phaser.GameObjects.Text
  private roomId!: string

  constructor() {
    super({ key: 'HoldemLoadingScene' })
  }

  init(data: { roomId: string }) {
    if (data && data.roomId) {
      this.roomId = data.roomId
    } else {
      this.roomId = this.registry.get('roomId')
    }
  }

  preload() {
    this.createLoadingUI()

    // 카드 뒷면
    this.load.image('card-back', 'https://deckofcardsapi.com/static/img/back.png')

    // 카드 앞면 (52장)
    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const suitMap: Record<string, string> = {
      hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S'
    }

    suits.forEach((suit) => {
      values.forEach((value) => {
        const suitCode = suitMap[suit]
        let valueCode = value
        if (value === 'A') valueCode = 'A'
        else if (value === 'J') valueCode = 'J'
        else if (value === 'Q') valueCode = 'Q'
        else if (value === 'K') valueCode = 'K'
        else if (value === '10') valueCode = '0'
        
        const cardKey = `card-${suit}-${value}`
        const imageUrl = `https://deckofcardsapi.com/static/img/${valueCode}${suitCode}.png`
        
        this.load.image(cardKey, imageUrl)
      })
    })
    
    // 기본 아바타 (placeholder)
    this.load.image('avatar-placeholder', 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y')

    // 테이블 텍스처 (단색으로 쓸 것이므로 이미지 로드 생략 가능하지만, 필요한 경우 추가)
    // 칩 이미지 등도 Graphics로 그릴 예정

    this.load.on('progress', (value: number) => {
      this.updateProgress(value)
    })

    this.load.on('complete', () => {
      this.loadingComplete()
    })
  }

  createLoadingUI() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000)

    this.progressBox = this.add.graphics()
    this.progressBox.fillStyle(0x222222, 0.8)
    this.progressBox.fillRect(width / 2 - 320, height / 2 - 30, 640, 60)

    this.progressBar = this.add.graphics()

    this.loadingText = this.add.text(width / 2, height / 2 - 100, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.assetText = this.add.text(width / 2, height / 2 + 50, '', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)
  }

  updateProgress(value: number) {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.progressBar.clear()
    this.progressBar.fillStyle(0x4caf50, 1)
    this.progressBar.fillRect(width / 2 - 310, height / 2 - 20, 620 * value, 40)

    const percent = Math.round(value * 100)
    this.percentText.setText(`${percent}%`)
  }

  loadingComplete() {
    this.scene.start('HoldemScene', { roomId: this.roomId })
  }
}
