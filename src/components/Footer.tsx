import { Link } from 'react-router-dom';
import { FaHome, FaComments, FaInfoCircle, FaBars } from 'react-icons/fa'; // Import icons

const Footer = () => {
  return (
    <div className="navbar bg-primary text-primary-content justify-center">
      <div className="">
        <Link to="/" className="btn btn-ghost text-xl flex items-center">
          <FaHome className="mr-2" /> {/* Home icon */}
        </Link>
      </div>
      <div>
        <ul className="menu menu-horizontal px-1 flex items-center space-x-4">
          <li>
            <Link to="/groups" className="flex items-center">
              <FaComments className="mr-2" /> {/* Chat icon */}
            </Link>
          </li>
          <li>
            <Link to="/" className="flex items-center">
              <FaInfoCircle className="mr-2" /> {/* Info icon */}
            </Link>
          </li>
          <li>
            <button className="flex items-center">
              <FaBars /> {/* Three-bar (hamburger) icon */}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Footer;
