"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "@/styles/globals.css"; // 引入全局样式
import "primeicons/primeicons.css"; // 引入 Primereact 图标样式
import { PrimeReactProvider } from "primereact/api";
import "primereact/resources/primereact.min.css"; // 引入 Primereact 核心样式
import "primereact/resources/themes/lara-light-blue/theme.css"; // 引入 Primereact 主题样式
import { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <html lang="en">
        <head>
          <link rel="icon" type="image/ico" href="./favicon.ico" />
          <title>QuickTranslate | Multilingual Translation Platform</title>
        </head>
        <body>
          <PrimeReactProvider>
            <div className="layout">
              <Header />
              <main className="main-content">{children}</main>
              <Footer />
            </div>
          </PrimeReactProvider>
        </body>
      </html>
    </>
  );
};

export default Layout;
