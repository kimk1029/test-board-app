import dynamic from 'next/dynamic'

// SSR 비활성화: Phaser는 브라우저에서만 실행되어야 함
const PerfectSlotMachine = dynamic(
  () => import('./SlotMachineGame'),
  { ssr: false }
)

export default function CloverPitPage() {
  return <PerfectSlotMachine />
}
