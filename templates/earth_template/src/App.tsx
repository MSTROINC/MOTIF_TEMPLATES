import { Viewer, Entity, CameraFlyTo } from "resium"
import { Cartesian3, Ion, Color, createWorldTerrainAsync } from "cesium"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNjA1YzJhOC1hMmM0LTRjNzMtYjFhMC03OGJlY2E0OTVmNDQiLCJpZCI6MjU5LCJpYXQiOjE3MjUwNTc4OTF9.default-token"

const locations = [
  { name: "New York", lat: 40.7128, lng: -74.006, height: 1500000 },
  { name: "London", lat: 51.5074, lng: -0.1278, height: 1500000 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, height: 1500000 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, height: 1500000 },
]

function App() {
  const [terrainProvider, setTerrainProvider] = useState<Awaited<ReturnType<typeof createWorldTerrainAsync>> | undefined>()

  useEffect(() => {
    createWorldTerrainAsync().then(setTerrainProvider).catch(() => {})
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-3 border-b">
        <h1 className="text-lg font-semibold tracking-tight">mSpace Earth</h1>
        <div className="flex gap-2">
          {locations.map((loc) => (
            <Button key={loc.name} variant="secondary" size="sm">
              {loc.name}
            </Button>
          ))}
        </div>
      </header>
      <div className="flex-1 relative">
        <Viewer
          full
          terrainProvider={terrainProvider}
          animation={false}
          timeline={false}
          baseLayerPicker={false}
          navigationHelpButton={false}
          homeButton={false}
          geocoder={false}
          sceneModePicker={false}
          fullscreenButton={false}
        >
          <CameraFlyTo
            destination={Cartesian3.fromDegrees(-74.006, 40.7128, 15000000)}
            duration={0}
          />
          {locations.map((loc) => (
            <Entity
              key={loc.name}
              name={loc.name}
              position={Cartesian3.fromDegrees(loc.lng, loc.lat)}
              point={{ pixelSize: 10, color: Color.fromCssColorString("hsl(210, 100%, 52%)") }}
              description={`<p>${loc.name}</p>`}
            />
          ))}
        </Viewer>
        <div className="absolute bottom-4 left-4 z-10 w-72">
          <Card className="bg-card/80 backdrop-blur-md border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Locations</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {locations.length} points plotted on the globe
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default App
