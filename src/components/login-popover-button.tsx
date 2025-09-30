import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Button from "./common/custom-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import DiscordIcon from "@/icons/discord";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { login, signup, logout } from "@/lib/auth-local";

type FormData = {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
};

function LoginPopoverButton() {
  const auth = useAuthStore();
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [tabValue, setTabValue] = useState<"login" | "signup">("login");

  const handleLogout = () => {
    logout();
    auth.clearAuth();
    toast.success("Logged out successfully", { style: { background: "green" } });
  };

  const loginWithEmail = async () => {
    try {
      if (formData.username === "" || formData.password === "") {
        toast.error("Please fill in all fields", {
          style: { background: "red" },
        });
        return;
      }

      const result = await login(formData.username, formData.password);

      if (result.success && result.user) {
        toast.success("Login successful", { style: { background: "green" } });
        clearForm();
        auth.setAuth({
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          avatar: result.user.avatar || "",
          collectionId: "users",
          collectionName: "users",
          autoSkip: result.user.autoSkip,
        });
      } else {
        toast.error(result.error || "Login failed", {
          style: { background: "red" },
        });
      }
    } catch (e) {
      console.error("Login error:", e);
      toast.error("Login failed", {
        style: { background: "red" },
      });
    }
  };

  const signupWithEmail = async () => {
    if (
      formData.username === "" ||
      formData.password === "" ||
      formData.email === "" ||
      formData.confirm_password === ""
    ) {
      toast.error("Please fill in all fields", {
        style: { background: "red" },
      });
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match", {
        style: { background: "red" },
      });
      return;
    }

    try {
      const result = await signup(formData.username, formData.email, formData.password);

      if (result.success && result.user) {
        toast.success("Account created successfully. Please login.", {
          style: { background: "green" },
        });
        clearForm();
        setTabValue("login");
      } else {
        toast.error(result.error || "Signup failed", {
          style: { background: "red" },
        });
      }
    } catch (e) {
      console.error("Signup error:", e);
      toast.error("Signup failed. Please try again.", {
        style: { background: "red" },
      });
    }
  };

  const clearForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      confirm_password: "",
    });
  };

  const loginWithDiscord = async () => {
    toast.error("Discord login is currently unavailable", {
      style: { background: "red" },
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-white text-md text-black hover:bg-gray-200 hover:text-black transition-all duration-300"
        >
          {auth.auth ? "Account" : "Login"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        className="bg-black bg-opacity-50 backdrop-blur-sm w-[300px] mt-4 mr-4 p-4"
      >
        {auth.auth ? (
          <div className="flex flex-col gap-2">
            <div className="text-center">
              <p className="text-white font-medium">Welcome, {auth.auth.username}!</p>
              <p className="text-gray-300 text-sm">{auth.auth.email}</p>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        ) : (
          <Tabs
            defaultValue={tabValue}
            value={tabValue}
            onValueChange={(value) => setTabValue(value as "login" | "signup")}
          >
          <TabsList>
            <TabsTrigger onClick={clearForm} value="login">
              Login
            </TabsTrigger>
            <TabsTrigger onClick={clearForm} value="signup">
              Signup
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="flex flex-col gap-2">
            <div className="mt-2">
              <p className="text-gray-300 text-xs">Email or Username:</p>
              <Input
                required
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                type="text"
                value={formData.username}
                placeholder="Enter your email/username"
              />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Password:</p>
              <Input
                required
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter your password"
              />
            </div>
            <Button
              variant="default"
              className="w-full text-xs"
              size="sm"
              type="submit"
              onClick={loginWithEmail}
            >
              Login
            </Button>
            <hr className="text-white text-xs text-center" />
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-800 text-white w-full text-xs"
              size="sm"
              onClick={loginWithDiscord}
            >
              <DiscordIcon className="mr-2" />
              Login with Discord
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="flex flex-col gap-2">
            <div>
              <p className="text-gray-300 text-xs">Username:</p>
              <Input
                required
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                type="text"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Email:</p>
              <Input
                required
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                type="email"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Password:</p>
              <Input
                required
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                type="password"
                placeholder="Enter your password"
              />
            </div>
            <div>
              <p className="text-gray-300 text-xs">Confirm Password:</p>
              <Input
                required
                onChange={(e) =>
                  setFormData({ ...formData, confirm_password: e.target.value })
                }
                type="password"
                placeholder="Enter your password again"
              />
            </div>
            <Button
              variant="default"
              className="w-full text-xs"
              size="sm"
              type="submit"
              onClick={signupWithEmail}
            >
              Signup
            </Button>
            <hr className="text-white text-xs text-center" />
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-800 text-white w-full text-xs"
              size="sm"
              onClick={loginWithDiscord}
            >
              <DiscordIcon className="mr-2" />
              Signup with Discord
            </Button>
          </TabsContent>
        </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default LoginPopoverButton;
