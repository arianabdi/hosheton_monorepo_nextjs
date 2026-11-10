'use client';

import React, {useState} from "react";
import {DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown} from "@my-workspace/components";
import {MdKeyboardArrowDown, MdOutlineTranslate} from "react-icons/md";
import style from './appicons.module.scss'
import {LuWalletCards} from "react-icons/lu";
import {GrBook} from "react-icons/gr";
import {PiFilmStrip} from "react-icons/pi";

export function AppsIcon({theme, iconSize}) {

  const [selectedApp, setSelectedApp] = useState('video_player');
  const [apps, setApps] = useState([
    {
      name: 'dictionary',
      icon: <MdOutlineTranslate size={iconSize} color={theme === 'light' ? "#000" : "#727272"}/>
    },
    {
      name: 'video_player',
      icon: <PiFilmStrip size={iconSize} color={theme === 'light' ? "#000" : "#727272"}/>
    },
    {
      name: 'flashcards',
      icon: <LuWalletCards size={iconSize} color={theme === 'light' ? "#000" : "#727272"}/>
    },
    {
      name: 'e_book_reader',
      icon: <GrBook size={iconSize} color={theme === 'light' ? "#000" : "#727272"}/>
    },
  ])


  function AppIconFinder(app) {
    switch (app) {
      case 'dictionary':
        return apps.find(app => app.name === 'dictionary').icon
      case 'video_player':
        return apps.find(app => app.name === 'video_player').icon
      case 'flashcards':
        return apps.find(app => app.name === 'flashcards').icon
      case 'e_book_reader':
        return apps.find(app => app.name === 'e_book_reader').icon
    }
  }

  return (
    <Dropdown className={'applistDropdown'}>
      <DropdownToggle
        tag="a"
        href="#more"
        onClick={(ev) => ev.preventDefault()}
        className="dropdown-toggle btn btn-icon btn-trigger p-1"
      >
        <div className={'d-flex flex-row align-center justify-center'} style={{gap: "10px"}}>
          <MdKeyboardArrowDown size={19} color={theme === 'light' ? "#000" : "#727272"}/>
          <div className={style.applications}>
            {AppIconFinder(selectedApp)}
          </div>
        </div>
      </DropdownToggle>
      <DropdownMenu end className={style.dropdown}>
        <ul className={`link-list-opt no-bdr app_list ${style.applist}`}>
          {
            apps.map((app, index) => {
              return (
                <li key={`header-action-btn-1`}>
                  <DropdownItem
                    tag="a"
                    href="#edit"
                    onClick={(ev) => {
                      setSelectedApp(app.name)
                    }}
                  >
                    <div className="action-btn-icon">
                      {app.icon}
                    </div>
                  </DropdownItem>
                </li>
              )
            })
          }
        </ul>
      </DropdownMenu>
    </Dropdown>
  )
}
