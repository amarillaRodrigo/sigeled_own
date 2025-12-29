import { useState, useRef } from "react";
import { MdOutlineNotifications } from "react-icons/md";
import { FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import DropdownNotificaciones from "./DropdownNotificaciones";

export default function Nav() {
    const { notifications } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const btnNotifRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.leido).length;

    return(
        <div className='absolute z-50 flex mt-5 space-x-4 transform right-7'>
            <div className="relative">
                <button
                    ref={btnNotifRef}
                    onClick={() => setShowDropdown(prev => !prev)}
                    className='bg-[#101922] p-3 flex items-center rounded-[1.1rem] font-bold hover:bg-[#1a2735] hover:cursor-pointer transition'
                >
                    <MdOutlineNotifications className="w-7 h-7 text-[#19F124]"/>

                    {unreadCount > 0 && (
                        <span className="absolute flex w-3 h-3 top-2 right-2">
                            <span className="absolute inline-flex w-full h-full bg-[#19F124] rounded-full opacity-75 animate-ping"></span>
                            <span className="relative inline-flex w-3 h-3 bg-[#19F124] rounded-full"></span>
                        </span>
                    )}
                </button>

                {showDropdown && (
                    <DropdownNotificaciones 
                        onClose={() => setShowDropdown(false)}
                        anchorRef={btnNotifRef}
                    />
                )}
            </div>
        </div>
    );
}
