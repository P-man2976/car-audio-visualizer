import { Avatar, Button, Card, Chip, Spinner, Switch } from '@heroui/react'
import './App.css'

function App() {
  return (
    <main
      style={{
        display: 'grid',
        gap: '16px',
        margin: '0 auto',
        maxWidth: '720px',
        padding: '24px',
      }}
    >
      <Card>
        <Card.Header>
          <Card.Title>HeroUI v3 Demo</Card.Title>
          <Card.Description>
            App.tsx を HeroUI v3 コンポーネントで構成したサンプルです。
          </Card.Description>
        </Card.Header>
        <Card.Content
          style={{
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: '12px' }}>
            <Avatar color="accent">
              <Avatar.Fallback>AV</Avatar.Fallback>
            </Avatar>
            <Chip color="success" variant="soft">
              <Chip.Label>Visualizer Ready</Chip.Label>
            </Chip>
          </div>
          <Spinner color="accent" size="sm" />
        </Card.Content>
        <Card.Footer style={{ alignItems: 'center', display: 'flex', gap: '12px' }}>
          <Switch defaultSelected>オーディオ解析を有効化</Switch>
          <Button>再生</Button>
          <Button variant="secondary">停止</Button>
        </Card.Footer>
      </Card>
    </main>
  )
}

export default App
