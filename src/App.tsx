import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

function App() {
	return (
		<main className="mx-auto grid w-full max-w-[720px] gap-4 p-6">
			<Card>
				<CardHeader>
					<CardTitle>shadcn/ui Demo</CardTitle>
					<CardDescription>
						App.tsx を shadcn/ui コンポーネントで構成したサンプルです。
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<Avatar>
							<AvatarFallback>AV</AvatarFallback>
						</Avatar>
						<Badge className="bg-green-600/60 text-green-100 border-transparent">
							Visualizer Ready
						</Badge>
					</div>
					<Loader2 className="size-4 animate-spin" />
				</CardContent>
				<CardFooter className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<Switch defaultChecked />
						<span className="text-sm">オーディオ解析を有効化</span>
					</div>
					<Button>再生</Button>
					<Button variant="secondary">停止</Button>
				</CardFooter>
			</Card>
		</main>
	);
}

export default App;
