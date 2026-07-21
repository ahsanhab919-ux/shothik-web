"use client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { setShowLoginModal, setShowRegisterModal } from "@/redux/slices/auth";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useDispatch, useSelector } from "react-redux";

const AuthModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[90%] overflow-auto rounded-lg p-8 sm:w-[450px] sm:max-w-[450px]">
        <VisuallyHidden.Root asChild>
          <DialogTitle>Authentication</DialogTitle>
        </VisuallyHidden.Root>
        <VisuallyHidden.Root asChild>
          <DialogDescription>
            Sign in or create an account to continue using Shothik AI.
          </DialogDescription>
        </VisuallyHidden.Root>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export const LoginModal = ({ children }) => {
  const dispatch = useDispatch();
  const { showLoginModal } = useSelector((state) => state.auth);

  const handleClose = () => {
    dispatch(setShowLoginModal(false));
  };

  return (
    <AuthModal isOpen={showLoginModal} onClose={handleClose}>
      {children}
    </AuthModal>
  );
};

export const RegisterModal = ({ children }) => {
  const dispatch = useDispatch();
  const { showRegisterModal } = useSelector((state) => state.auth);

  const handleClose = () => {
    dispatch(setShowRegisterModal(false));
  };

  return (
    <AuthModal isOpen={showRegisterModal} onClose={handleClose}>
      {children}
    </AuthModal>
  );
};
