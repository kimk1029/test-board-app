import Phaser from 'phaser'
import { createDeck } from '../utils'

export class LoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics
  private progressBox!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text
  private percentText!: Phaser.GameObjects.Text
  private assetText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'LoadingScene' })
  }

  preload() {
    // 로딩 UI 생성
    this.createLoadingUI()

    // 카드 뒷면 이미지
    this.load.image('card-back', 'https://deckofcardsapi.com/static/img/back.png')

    // 모든 카드 앞면 이미지 로드 (52장)
    const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades']
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const suitMap: Record<string, string> = {
      hearts: 'H',
      diamonds: 'D',
      clubs: 'C',
      spades: 'S',
    }

    suits.forEach((suit) => {
      values.forEach((value) => {
        const suitCode = suitMap[suit]
        // 값 코드 변환 (Deck of Cards API 형식)
        let valueCode = value
        if (value === 'A') valueCode = 'A'
        else if (value === 'J') valueCode = 'J'
        else if (value === 'Q') valueCode = 'Q'
        else if (value === 'K') valueCode = 'K'
        else if (value === '10') valueCode = '0' // 10은 0으로 표시
        else valueCode = value
        
        const cardKey = `card-${suit}-${value}`
        const imageUrl = `https://deckofcardsapi.com/static/img/${valueCode}${suitCode}.png`
        
        // 이미지 로드
        this.load.image(cardKey, imageUrl)
      })
    })

    // 칩 이미지들은 Graphics로 직접 그리므로 로드하지 않음
    // 필요시 실제 칩 이미지 URL을 사용할 수 있습니다

    // 테이블 배경 이미지 (선택사항 - 없으면 색상 사용)
    // this.load.image('table-bg', '테이블_이미지_URL')

    // 로딩 이벤트 리스너
    this.load.on('progress', (value: number) => {
      this.updateProgress(value)
    })

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.assetText.setText(`Loading: ${file.key}`)
    })

    this.load.on('complete', () => {
      this.loadingComplete()
    })
  }

  createLoadingUI() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000)

    // Progress Box
    this.progressBox = this.add.graphics()
    this.progressBox.fillStyle(0x222222, 0.8)
    this.progressBox.fillRect(width / 2 - 320, height / 2 - 30, 640, 60)

    // Progress Bar
    this.progressBar = this.add.graphics()

    // Loading Text
    this.loadingText = this.add.text(width / 2, height / 2 - 100, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5)

    // Percent Text
    this.percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5)

    // Asset Text
    this.assetText = this.add.text(width / 2, height / 2 + 50, '', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5)
  }

  updateProgress(value: number) {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Progress Bar 업데이트
    this.progressBar.clear()
    this.progressBar.fillStyle(0x4caf50, 1)
    this.progressBar.fillRect(width / 2 - 310, height / 2 - 20, 620 * value, 40)

    // Percent Text 업데이트
    const percent = Math.round(value * 100)
    this.percentText.setText(`${percent}%`)
  }

  loadingComplete() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 완료 메시지
    this.loadingText.setText('Loading Complete!')
    this.percentText.setText('100%')
    this.assetText.setText('')

    // Progress Bar를 100%로 설정
    this.progressBar.clear()
    this.progressBar.fillStyle(0x4caf50, 1)
    this.progressBar.fillRect(width / 2 - 310, height / 2 - 20, 620, 40)

    // 잠시 대기 후 게임 씬으로 전환
    this.time.delayedCall(500, () => {
      this.scene.start('BlackjackScene')
    })
  }
}

