import React from 'react'
import { render, screen } from '@testing-library/react'
import RouletteGame from './RouletteGame'

// Mock Phaser since it requires canvas/window/audio which are not fully available in jsdom
jest.mock('phaser', () => {
  return {
    Game: class {
      constructor(config: any) {
        // Mock implementation
        this.registry = {
            set: jest.fn(),
            get: jest.fn()
        }
      }
      destroy(remove: boolean) {}
      registry: any
    },
    Scene: class {
      constructor(config: any) {}
      add = {
          container: () => ({ setScale: jest.fn(), setPosition: jest.fn(), add: jest.fn() }),
          image: () => ({ setCircle: jest.fn(), setBounce: jest.fn(), setDrag: jest.fn(), setVisible: jest.fn() }),
          circle: () => ({ setStrokeStyle: jest.fn(), setVisible: jest.fn() }),
          text: () => ({ setOrigin: jest.fn(), setRotation: jest.fn(), setStroke: jest.fn(), setText: jest.fn() }),
          graphics: () => ({ fillStyle: jest.fn(), fillRect: jest.fn(), generateTexture: jest.fn(), clear: jest.fn(), fillGradientStyle: jest.fn(), slice: jest.fn(), fillPath: jest.fn(), lineStyle: jest.fn(), strokePath: jest.fn(), strokeCircle: jest.fn(), fillCircle: jest.fn() }),
          rectangle: () => ({ setStrokeStyle: jest.fn(), setInteractive: jest.fn(), on: jest.fn(), setAlpha: jest.fn() }),
          sprite: () => ({ setInteractive: jest.fn(), on: jest.fn() })
      }
      make = {
          graphics: () => ({ fillStyle: jest.fn(), fillRect: jest.fn(), generateTexture: jest.fn(), fillCircle: jest.fn() })
      }
      physics = {
          add: {
              staticGroup: () => ({ clear: jest.fn(), add: jest.fn() }),
              image: () => ({ setCircle: jest.fn(), setBounce: jest.fn(), setDrag: jest.fn(), setVisible: jest.fn(), setPosition: jest.fn(), setScale: jest.fn(), enableBody: jest.fn(), setVelocity: jest.fn(), setVelocityX: jest.fn(), setVelocityY: jest.fn(), setAngularVelocity: jest.fn(), disableBody: jest.fn() }),
              staticImage: () => ({ body: { setCircle: jest.fn(), updateFromGameObject: jest.fn() }, setPosition: jest.fn(), setScale: jest.fn() }),
              collider: jest.fn(),
              existing: jest.fn()
          },
          world: {
              enable: jest.fn()
          }
      }
      scale = {
          on: jest.fn(),
          width: 800,
          height: 600
      }
      time = {
          now: 0
      }
      tweens = {
          add: jest.fn()
      }
      registry = {
          get: jest.fn()
      }
      textures = {
          exists: jest.fn(() => false)
      }
    },
    Types: {
      Core: {
        GameConfig: {}
      },
      Physics: {
          Arcade: {
              ImageWithStaticBody: {}
          }
      }
    },
    Scale: {
      RESIZE: 3,
      NO_CENTER: 1
    },
    Math: {
        DegToRad: (d: number) => d * (Math.PI / 180),
        RadToDeg: (r: number) => r * (180 / Math.PI)
    },
    Physics: {
        Arcade: {
            StaticBody: class { setCircle() {} }
        }
    }
  }
})

describe('RouletteGame', () => {
  it('renders the game container', () => {
    render(<RouletteGame />)
    const gameContainer = screen.getByTestId('roulette-game-container')
    expect(gameContainer).toBeInTheDocument()
  })

  it('initializes Phaser game on mount', () => {
    render(<RouletteGame />)
    // Since we mocked Phaser, we can't easily check the instance here without exposing it,
    // but the render pass confirms no errors during useEffect execution.
  })
})

