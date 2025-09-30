import React from "react";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="w-full bg-base-300 shadow-xl p-3 flex items-center justify-center space-x-4">
      <div className="flex space-x-3 items-center">
        <a href="https://github.com/Dovakiin0/Kitsune" target="_blank">
          <GitHubLogoIcon width="18" height="18" />
        </a>
        <a href="https://discord.gg/6yAJ3XDHTt" target="_blank">
          <DiscordLogoIcon width="18" height="18" />
        </a>
      </div>
      <p className="text-xs text-gray-400">&copy; Kitsune</p>
    </footer>
  );
};

export default Footer;
