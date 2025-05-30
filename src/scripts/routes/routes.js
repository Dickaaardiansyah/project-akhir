import LoginView from '../pages/login/login-view';
import RegisterView from '../pages/register/register-view';
import HomePage from '../pages/home/home-page';
import AddPage from '../pages/add/add-page';
import BookmarkPage from '../pages/bookmark/bookmark-page'





const routes = {
  '/': new LoginView(),
  '/login': new LoginView(),
  '/register': new RegisterView(),
  '/home': new HomePage(),
  '/add': new AddPage(),
  '/bookmark': new BookmarkPage(),
};

export default routes;
