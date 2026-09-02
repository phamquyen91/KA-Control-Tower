import { auth } from "@/auth";
import ControlTower from "@/components/ControlTower";

export default async function Home() {
  // Email hiển thị ở sidebar lấy từ chính phiên đăng nhập, không ghi cứng.
  const session = await auth();
  return <ControlTower userEmail={session?.user?.email ?? ""} />;
}
