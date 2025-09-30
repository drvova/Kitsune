"use client";
import React, { useEffect } from "react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { useAuthHydrated, useAuthStore } from "@/store/auth-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import CoverImage from "@/assets/cover.png";
import AnimeLists from "./components/anime-lists";
import AnimeHeatmap from "./components/anime-heatmap";
import Loading from "@/app/loading";
import AnilistImport from "./components/anilist-import";

function ProfilePage() {
  const { auth, setAuth } = useAuthStore();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasHydrated = useAuthHydrated();

  useEffect(() => {
    if (hasHydrated && !auth) {
      router.replace("/");
    }
  }, [auth, hasHydrated, router]);

  if (!hasHydrated) {
    return <Loading />;
  }

  if (!auth) {
    return null;
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert file to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        // Update user in localStorage
        const users = JSON.parse(localStorage.getItem('kitsune_users') || '[]');
        const userIndex = users.findIndex((u: any) => u.id === auth.id);
        if (userIndex >= 0) {
          users[userIndex].avatar = dataUrl;
          localStorage.setItem('kitsune_users', JSON.stringify(users));
          setAuth({ ...auth, avatar: dataUrl });
          toast.success("Avatar updated successfully", {
            style: { background: "green" },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="w-full h-48 md:h-64 lg:h-72 relative">
        <Image
          src={CoverImage.src}
          alt={"cover"}
          fill
          className="object-cover"
          priority
          placeholder="blur"
          blurDataURL={CoverImage.blurDataURL}
        />
      </div>
      <Container className="min-h-[70vh] mt-10 flex flex-col md:flex-row justify-around gap-8 md:gap-4">
        <div className="flex flex-col items-center gap-5 w-full md:w-1/3">
          <Avatar
            data-testid="profile-avatar"
            className="w-[150px] h-[150px] cursor-pointer"
            username={auth.username}
            url={auth.avatar}
            collectionID={auth.collectionId}
            id={auth.id}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <h2 data-testid="profile-username" className="text-xl">@{auth.username}</h2>
        </div>
        <div className="w-full md:w-2/3">
          <div className="w-full">
            <div className="float-right flex gap-2 items-center mb-2">
              <p className="text-sm text-gray-500">Import:</p>
              <AnilistImport />
            </div>
            <Tabs defaultValue="watching" className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-5">
                <TabsTrigger value="watching">Watching</TabsTrigger>
                <TabsTrigger value="plan-to-watch">Plan To Watch</TabsTrigger>
                <TabsTrigger value="on-hold">On Hold</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="dropped">Dropped</TabsTrigger>
              </TabsList>

              <TabsContent value="watching" className="mt-4">
                <AnimeLists status="watching" />
              </TabsContent>
              <TabsContent value="plan-to-watch" className="mt-4">
                <AnimeLists status="plan to watch" />
              </TabsContent>
              <TabsContent value="on-hold" className="mt-4">
                <AnimeLists status="on hold" />
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <AnimeLists status="completed" />
              </TabsContent>
              <TabsContent value="dropped" className="mt-4">
                <AnimeLists status="dropped" />
              </TabsContent>
            </Tabs>
          </div>
          <div className="my-20">
            <AnimeHeatmap />
          </div>
        </div>
      </Container>
    </>
  );
}

export default ProfilePage;
